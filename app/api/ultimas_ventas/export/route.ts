import { requireSession } from "@/lib/auth";
import { getVentasAndReparaciones } from "@/lib/data";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const fechaDesde = searchParams.get("fecha_desde") ?? new Date().toISOString().slice(0, 10);
  const fechaHasta = searchParams.get("fecha_hasta") ?? new Date().toISOString().slice(0, 10);
  const data = await getVentasAndReparaciones(fechaDesde, fechaHasta);

  const workbook = XLSX.utils.book_new();
  const ventasSheet = XLSX.utils.json_to_sheet(
    data.ventas.map((venta) => ({
      id_venta: venta.venta_id,
      producto: venta.nombre_producto,
      cantidad: venta.cantidad,
      precio_unitario: Number(venta.precio_unitario),
      total: Number(venta.total),
      fecha: venta.fecha,
      tipo_pago: venta.tipo_pago,
      dni_cliente: venta.dni_cliente ?? ""
    }))
  );
  const reparacionesSheet = XLSX.utils.json_to_sheet(
    data.reparaciones.map((item) => ({
      id_reparacion: item.reparacion_id,
      servicio: item.nombre_servicio,
      cantidad: item.cantidad,
      precio_unitario: Number(item.precio_unitario),
      total: Number(item.total),
      fecha: item.fecha,
      tipo_pago: item.tipo_pago
    }))
  );

  XLSX.utils.book_append_sheet(workbook, ventasSheet, "Ventas");
  XLSX.utils.book_append_sheet(workbook, reparacionesSheet, "Reparaciones");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ventas_${fechaDesde}_a_${fechaHasta}.xlsx"`
    }
  });
}
