import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { searchConsultas } from "@/lib/monitoreo";

export async function GET(request: Request) {
  await requireSession();

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  try {
    const items = await searchConsultas(query);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar las consultas desde monitoreo.";
    return NextResponse.json({ items: [], error: message }, { status: 502 });
  }
}
