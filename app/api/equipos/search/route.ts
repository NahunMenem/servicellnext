import { requireSession } from "@/lib/auth";
import { getEquiposSearch } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const fechaDesde = searchParams.get("fecha_desde") ?? "";
  const fechaHasta = searchParams.get("fecha_hasta") ?? "";
  const page = parsePage(searchParams.get("page") ?? undefined);

  const data = await getEquiposSearch(fechaDesde, fechaHasta, query, page);
  return NextResponse.json(data);
}
