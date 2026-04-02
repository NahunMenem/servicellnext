import { requireSession } from "@/lib/auth";
import { getVentasAndReparaciones } from "@/lib/data";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvSection<T extends Record<string, unknown>>(title: string, rows: T[]) {
  if (!rows.length) {
    return `${title}\nSin datos\n`;
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    title,
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ];

  return `${lines.join("\n")}\n`;
}

export async function GET(request: Request) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const fechaDesde = searchParams.get("fecha_desde") ?? new Date().toISOString().slice(0, 10);
  const fechaHasta = searchParams.get("fecha_hasta") ?? new Date().toISOString().slice(0, 10);
  const data = await getVentasAndReparaciones(fechaDesde, fechaHasta);

  const ventasRows = data.ventas.map((venta) => ({
    tipo_registro: "venta",
    id_venta: venta.venta_id,
    producto: venta.nombre_producto,
    cantidad: venta.cantidad,
    precio_unitario: Number(venta.precio_unitario),
    total: Number(venta.total),
    fecha: venta.fecha,
    tipo_pago: venta.tipo_pago,
    dni_cliente: venta.dni_cliente ?? ""
  }));

  const reparacionesRows = data.reparaciones.map((item) => ({
    tipo_registro: "reparacion",
    id_reparacion: item.reparacion_id,
    servicio: item.nombre_servicio,
    cantidad: item.cantidad,
    precio_unitario: Number(item.precio_unitario),
    total: Number(item.total),
    fecha: item.fecha,
    tipo_pago: item.tipo_pago
  }));

  const csv = [buildCsvSection("Ventas", ventasRows), buildCsvSection("Reparaciones", reparacionesRows)].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ventas_${fechaDesde}_a_${fechaHasta}.csv"`
    }
  });
}
