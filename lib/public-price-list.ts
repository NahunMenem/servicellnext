import type { SparePartPriceItem } from "@/lib/types";

const SPREADSHEET_ID = "1G1s5xF9nWG49ydyp21vsU2VXXRmXQXT4";
const SHEET_NAMES = [
  "MÓDULOS",
  "BATERÍAS",
  "PLACAS DE CARGA",
  "TAPAS",
  "FLEX",
  "PORTA SIM",
  "LENTES DE CÁMARA",
  "PIEZAS CHICAS ",
  "CÁMARAS"
];

type GoogleSheetCell = {
  v?: string | number | null;
  f?: string;
};

type GoogleSheetResponse = {
  table?: {
    rows?: Array<{
      c?: Array<GoogleSheetCell | null>;
    }>;
  };
};

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

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start < 0 || end < 0) {
    throw new Error("No se pudo interpretar la respuesta publica de Google Sheets.");
  }

  return JSON.parse(text.slice(start, end + 1)) as GoogleSheetResponse;
}

async function fetchSheetRows(sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, {
    next: { revalidate: 900 }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer la hoja ${sheetName} (${response.status}).`);
  }

  const payload = extractJson(await response.text());

  return (payload.table?.rows ?? []).map((row) => (row.c ?? []).map((cell) => cell?.f ?? cell?.v ?? ""));
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
      categoria: normalizeCell(sheetName),
      marca,
      modelo,
      precio,
      descripcion: [normalizeCell(sheetName), marca, modelo].filter(Boolean).join(" - ")
    });
  }

  return items;
}

export async function getPublicSparePartOptions() {
  const sheetRows = await Promise.all(
    SHEET_NAMES.map((sheetName) => fetchSheetRows(sheetName).then((rows) => [sheetName, rows] as const))
  );

  return sheetRows
    .flatMap(([sheetName, rows]) => buildSheetItems(sheetName, rows))
    .sort((left, right) => left.descripcion.localeCompare(right.descripcion, "es"));
}
