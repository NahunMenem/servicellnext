import * as XLSX from "xlsx";
import type { SparePartPriceItem } from "@/lib/types";

const PRICE_LIST_URL =
  "https://docs.google.com/spreadsheets/d/1G1s5xF9nWG49ydyp21vsU2VXXRmXQXT4/export?format=xlsx";
const EXCLUDED_SHEETS = new Set(["TERMINOS Y CONDICIONES", "CELULARES"]);

function normalizeCell(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: unknown) {
  return normalizeCell(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parsePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = normalizeCell(value);
  if (!text) {
    return 0;
  }

  const normalized = text.replace(/[^0-9.,-]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function buildSheetItems(sheetName: string, rows: unknown[][]) {
  const headerIndex = rows.findIndex((row) => {
    const keys = row.map(normalizeKey);
    return keys.includes("MODELO") && keys.includes("PRECIO");
  });

  if (headerIndex < 0) {
    return [];
  }

  const header = rows[headerIndex].map(normalizeKey);
  const marcaIndex = header.findIndex((value) => value === "MARCA");
  const modeloIndex = header.findIndex((value) => value === "MODELO");
  const precioIndex = header.findIndex((value) => value === "PRECIO");

  if (modeloIndex < 0 || precioIndex < 0) {
    return [];
  }

  const items: SparePartPriceItem[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const precio = parsePrice(row[precioIndex]);
    const modelo = normalizeCell(row[modeloIndex]);
    const marca = marcaIndex >= 0 ? normalizeCell(row[marcaIndex]) : "";

    if (!modelo || precio <= 0) {
      continue;
    }

    items.push({
      id: `${sheetName}-${marca}-${modelo}`.toLowerCase().replace(/\s+/g, "-"),
      categoria: sheetName,
      marca,
      modelo,
      precio,
      descripcion: [sheetName, marca, modelo].filter(Boolean).join(" - ")
    });
  }

  return items;
}

export async function getPublicSparePartOptions() {
  const response = await fetch(PRICE_LIST_URL, {
    next: { revalidate: 900 }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer la lista publica de repuestos (${response.status}).`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });

  return workbook.SheetNames.filter((sheetName) => !EXCLUDED_SHEETS.has(normalizeKey(sheetName)))
    .flatMap((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      return buildSheetItems(sheetName, rows);
    })
    .sort((left, right) => left.descripcion.localeCompare(right.descripcion, "es"));
}
