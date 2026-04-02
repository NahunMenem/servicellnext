import { requireSession } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import type { ProductoListItem } from "@/lib/types";

export async function GET(request: Request) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const page = parsePage(searchParams.get("page") ?? undefined);
  const pageSize = 10;
  const offset = Math.max(page - 1, 0) * pageSize;

  if (query) {
    const { rows } = await sql<ProductoListItem>(
      `
        SELECT id, nombre, codigo_barras, stock, precio::text, precio_costo::text
        FROM productos
        WHERE nombre ILIKE $1 OR codigo_barras ILIKE $1
        ORDER BY nombre ASC
        LIMIT $2 OFFSET $3
      `,
      [`%${query}%`, pageSize + 1, offset]
    );

    return NextResponse.json({ items: rows.slice(0, pageSize), hasNext: rows.length > pageSize });
  }

  const { rows } = await sql<ProductoListItem>(
    `
      SELECT id, nombre, codigo_barras, stock, precio::text, precio_costo::text
      FROM productos
      ORDER BY nombre ASC
      LIMIT $1 OFFSET $2
    `,
    [pageSize + 1, offset]
  );

  return NextResponse.json({ items: rows.slice(0, pageSize), hasNext: rows.length > pageSize });
}
