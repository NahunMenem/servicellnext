import { CajaShell } from "@/components/caja-shell";
import { getCaja } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { toInputDate } from "@/lib/utils";

export default async function CajaPage({
  searchParams
}: {
  searchParams: Promise<{ fecha_desde?: string; fecha_hasta?: string; page?: string }>;
}) {
  const params = await searchParams;
  const today = toInputDate(new Date());
  const fechaDesde = params.fecha_desde ?? today;
  const fechaHasta = params.fecha_hasta ?? today;
  const page = parsePage(params.page);
  const caja = await getCaja(fechaDesde, fechaHasta, page);

  return <CajaShell caja={caja} fechaDesde={fechaDesde} fechaHasta={fechaHasta} page={page} />;
}
