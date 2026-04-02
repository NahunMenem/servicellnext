import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await requireSession();
  const body = (await request.json()) as { nroOrden?: string; firma?: string };

  if (!body.nroOrden || !body.firma) {
    return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });
  }

  await sql("UPDATE equipos SET firma_cliente = $1 WHERE nro_orden = $2", [
    body.firma,
    body.nroOrden
  ]);

  return NextResponse.json({ message: "Firma guardada correctamente" });
}
