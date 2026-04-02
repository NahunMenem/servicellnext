import { cancelRepairSaleAction, cancelSaleAction } from "@/app/actions";
import { PaginationControls } from "@/components/pagination-controls";
import { getVentasAndReparaciones } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { formatCurrency, formatDate, toInputDate } from "@/lib/utils";

export default async function UltimasVentasPage({
  searchParams
}: {
  searchParams: Promise<{ fecha_desde?: string; fecha_hasta?: string; page?: string }>;
}) {
  const params = await searchParams;
  const today = toInputDate(new Date());
  const fechaDesde = params.fecha_desde ?? today;
  const fechaHasta = params.fecha_hasta ?? today;
  const page = parsePage(params.page);
  const data = await getVentasAndReparaciones(fechaDesde, fechaHasta, page);
  const buildHref = (nextPage: number) =>
    `/ultimas_ventas?${new URLSearchParams({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      page: String(nextPage)
    }).toString()}`;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Ultimas ventas</h1>
          <p>Listado combinado de ventas y reparaciones con filtro de fechas y exportacion.</p>
        </div>
        <div className="actions">
          <form className="actions">
            <input type="date" name="fecha_desde" defaultValue={fechaDesde} />
            <input type="date" name="fecha_hasta" defaultValue={fechaHasta} />
            <button className="button secondary" type="submit">
              Filtrar
            </button>
          </form>
          <a
            className="button"
            href={`/api/ultimas_ventas/export?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`}
          >
            Exportar Excel
          </a>
        </div>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <strong>Ventas</strong>
          <div className="actions">
            {Object.entries(data.totalVentasPorPago).map(([tipo, total]) => (
              <span key={tipo} className="pill">
                {tipo}: {formatCurrency(total)}
              </span>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.ventas.map((venta) => (
                  <tr key={venta.venta_id}>
                    <td>
                      <strong>{venta.nombre_producto}</strong>
                      <div className="muted">Cant: {venta.cantidad}</div>
                    </td>
                    <td>{venta.tipo_pago}</td>
                    <td>{formatCurrency(venta.total)}</td>
                    <td>{formatDate(venta.fecha)}</td>
                    <td>
                      <form action={cancelSaleAction}>
                        <input type="hidden" name="venta_id" value={venta.venta_id} />
                        <button className="button danger" type="submit">
                          Anular
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls buildHref={buildHref} hasNext={data.hasNextVentas} page={page} />
        </section>

        <section className="card stack">
          <strong>Reparaciones</strong>
          <div className="actions">
            {Object.entries(data.totalReparacionesPorPago).map(([tipo, total]) => (
              <span key={tipo} className="pill">
                {tipo}: {formatCurrency(total)}
              </span>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.reparaciones.map((item) => (
                  <tr key={item.reparacion_id}>
                    <td>{item.nombre_servicio}</td>
                    <td>{item.tipo_pago}</td>
                    <td>{formatCurrency(item.total)}</td>
                    <td>{formatDate(item.fecha)}</td>
                    <td>
                      <form action={cancelRepairSaleAction}>
                        <input type="hidden" name="reparacion_id" value={item.reparacion_id} />
                        <button className="button danger" type="submit">
                          Anular
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls buildHref={buildHref} hasNext={data.hasNextReparaciones} page={page} />
        </section>
      </div>
    </div>
  );
}
