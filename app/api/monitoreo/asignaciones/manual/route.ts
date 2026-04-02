import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { assignConsultaManual } from "@/lib/monitoreo";

export async function POST(request: Request) {
  await requireSession();

  const body = (await request.json()) as {
    consulta_id?: string;
    medico_id?: string;
    forzar_en_camino?: boolean;
  };

  const consultaId = String(body.consulta_id ?? "").trim();
  const medicoId = String(body.medico_id ?? "").trim();

  if (!consultaId || !medicoId) {
    return NextResponse.json(
      { error: "Debes seleccionar una consulta y un medico antes de confirmar." },
      { status: 400 }
    );
  }

  try {
    const data = await assignConsultaManual(consultaId, medicoId, Boolean(body.forzar_en_camino));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo completar la asignacion manual.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
