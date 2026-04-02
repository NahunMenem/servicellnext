import type { SparePartPriceItem } from "@/lib/types";

const SPREADSHEET_ID = "1G1s5xF9nWG49ydyp21vsU2VXXRmXQXT4";
const SHEETS = [
  { categoria: "Modulos", sheet: "M\u00D3DULOS" },
  { categoria: "Baterias", sheet: "BATER\u00CDAS" },
  { categoria: "Placas de carga", sheet: "PLACAS DE CARGA" },
  { categoria: "Tapas", sheet: "TAPAS" },
  { categoria: "Flex", sheet: "FLEX" },
  { categoria: "Porta SIM", sheet: "PORTA SIM" },
  { categoria: "Lentes de camara", sheet: "LENTES DE C\u00C1MARA" },
  { categoria: "Piezas chicas", sheet: "PIEZAS CHICAS " },
  { categoria: "Camaras", sheet: "C\u00C1MARAS" }
] as const;

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
  const text = normalizeCell(value).replace(/[^0-9.,-]/g, "");
  if (!text) {
    return 0;
  }

  if (text.includes(",") && text.includes(".")) {
    const normalized = text.replace(/,/g, "");
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  if (text.includes(",")) {
    const normalized = text.replace(/\./g, "").replace(",", ".");
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  const normalized = text.replace(/,/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      value = "";
      if (row.some((cell) => cell.length)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.length)) {
    rows.push(row);
  }

  return rows;
}

async function fetchSheetRows(sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url, {
    next: { revalidate: 900 }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer la hoja ${sheetName} (${response.status}).`);
  }

  return parseCsv(await response.text());
}

function buildSheetItems(categoria: string, sheetName: string, rows: string[][]) {
  const headerIndex = rows.findIndex((row) => {
    const keys = row.map(normalizeKey);
    return (
      keys.includes("PRECIO") &&
      (keys.includes("MODELO") || keys.includes("CAMARA PRINCIPAL") || keys.includes("CAMARA FRONTAL"))
    );
  });

  if (headerIndex < 0) {
    return [];
  }

  const header = rows[headerIndex].map(normalizeKey);
  const fallbackMarcaIndex = header[0] ? -1 : 0;
  const marcaIndex = header.findIndex((value) => value === "MARCA");
  const modeloIndex = header.findIndex((value) =>
    ["MODELO", "CAMARA PRINCIPAL", "CAMARA FRONTAL"].includes(value)
  );
  const precioIndex = header.findIndex((value) => value === "PRECIO");

  if (modeloIndex < 0 || precioIndex < 0) {
    return [];
  }

  const items: SparePartPriceItem[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const precio = parsePrice(row[precioIndex]);
    const modelo = normalizeCell(row[modeloIndex]);
    const marca = marcaIndex >= 0 ? normalizeCell(row[marcaIndex]) : fallbackMarcaIndex >= 0 ? normalizeCell(row[fallbackMarcaIndex]) : "";

    if (!modelo || precio <= 0) {
      continue;
    }

    items.push({
      id: `${sheetName}-${marca}-${modelo}`.toLowerCase().replace(/\s+/g, "-"),
      categoria,
      marca,
      modelo,
      precio,
      descripcion: [categoria, marca, modelo].filter(Boolean).join(" - ")
    });
  }

  return items;
}

export async function getPublicSparePartOptions() {
  try {
    const sheetRows = await Promise.all(
      SHEETS.map(({ categoria, sheet }) => fetchSheetRows(sheet).then((rows) => ({ categoria, sheet, rows })))
    );

    return sheetRows
      .flatMap(({ categoria, sheet, rows }) => buildSheetItems(categoria, sheet, rows))
      .sort((left, right) => left.descripcion.localeCompare(right.descripcion, "es"));
  } catch (error) {
    console.error("No se pudo cargar la lista publica de repuestos", error);
    return [];
  }
}
