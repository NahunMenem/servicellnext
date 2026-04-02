import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { searchMedicos } from "@/lib/monitoreo";

export async function GET(request: Request) {
  await requireSession();

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  try {
    const items = await searchMedicos(query);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los medicos desde monitoreo.";
    return NextResponse.json({ items: [], error: message }, { status: 502 });
  }
}
