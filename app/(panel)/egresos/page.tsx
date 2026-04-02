import { createEgresoAction } from "@/app/actions";
import { EgresoActionsCell } from "@/components/egreso-actions-cell";
import { Modal } from "@/components/modal";
import { PaginationControls } from "@/components/pagination-controls";
import { getEgresos, getRepairOrderOptions } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { formatCurrency, toInputDate } from "@/lib/utils";

export default async function EgresosPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; fecha_desde?: string; fecha_hasta?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const fechaDesde = params.fecha_desde ?? "";
  const fechaHasta = params.fecha_hasta ?? "";
  const [egresos, repairOrders] = await Promise.all([
    getEgresos(fechaDesde, fechaHasta, page),
    getRepairOrderOptions()
  ]);

  const paginationHref = (nextPage: number) => {
    const query = new URLSearchParams();
    query.set("page", String(nextPage));
    if (fechaDesde) query.set("fecha_desde", fechaDesde);
    if (fechaHasta) query.set("fecha_hasta", fechaHasta);
    return `/egresos?${query.toString()}`;
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Egresos</h1>
          <p>Registro de salidas con fecha, descripcion y tipo de pago.</p>
        </div>
        <Modal
          description="Carga un egreso nuevo sin salir del historial."
          title="Nuevo egreso"
          triggerLabel="Agregar egreso"
        >
          <form action={createEgresoAction} className="form-grid">
            <input type="hidden" name="fecha_desde" value={fechaDesde} />
            <input type="hidden" name="fecha_hasta" value={fechaHasta} />
            <div className="field">
              <label>Fecha</label>
              <input name="fecha" type="date" defaultValue={toInputDate(new Date())} required />
            </div>
            <div className="field">
              <label>Monto</label>
              <input name="monto" type="number" step="0.01" required />
            </div>
            <div className="field full">
              <label>Descripcion</label>
              <input name="descripcion" required />
            </div>
            <div className="field">
              <label>Tipo de pago</label>
              <select name="tipo_pago" defaultValue="efectivo">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="mercado pago">Mercado Pago</option>
              </select>
            </div>
            <div className="field">
              <label>Tipo de egreso</label>
              <select name="tipo_egreso" defaultValue="general">
                <option value="general">General</option>
                <option value="repuesto_reparacion">Repuesto de reparacion</option>
              </select>
            </div>
            <div className="field full">
              <label>Vincular a reparacion</label>
              <select name="equipo_id" defaultValue="">
                <option value="">Sin vincular</option>
                {repairOrders.map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nro_orden} · {equipo.nombre_cliente} · {equipo.marca} {equipo.modelo}
                  </option>
                ))}
              </select>
            </div>
            <div className="actions">
              <button className="button" type="submit">
                Guardar egreso
              </button>
            </div>
          </form>
        </Modal>
      </div>

      <section className="card stack">
        <div className="dashboard-filter-head">
          <strong>Historial</strong>
          <span className="muted">Filtra por rango de fechas para revisar salidas puntuales.</span>
        </div>
        <form className="dashboard-filter-grid">
          <label className="field">
            <span>Fecha desde</span>
            <input name="fecha_desde" type="date" defaultValue={fechaDesde} />
          </label>
          <label className="field">
            <span>Fecha hasta</span>
            <input name="fecha_hasta" type="date" defaultValue={fechaHasta} />
          </label>
          <div className="actions" style={{ alignItems: "end" }}>
            <button className="button secondary" type="submit">
              Aplicar filtro
            </button>
          </div>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripcion</th>
                <th>Vinculo</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {egresos.items.map((egreso) => (
                <tr key={egreso.id}>
                  <td>{egreso.fecha}</td>
                  <td>{egreso.descripcion}</td>
                  <td>
                    {egreso.nro_orden ? (
                      <div className="stack" style={{ gap: "0.35rem" }}>
                        <strong>{egreso.nro_orden}</strong>
                        <div className="muted">{egreso.nombre_cliente}</div>
                      </div>
                    ) : (
                      <span className="muted">Sin vincular</span>
                    )}
                  </td>
                  <td>{egreso.tipo_egreso === "repuesto_reparacion" ? "Repuesto reparacion" : "General"}</td>
                  <td>{egreso.tipo_pago}</td>
                  <td>{formatCurrency(egreso.monto)}</td>
                  <td>
                    <EgresoActionsCell
                      egreso={egreso}
                      fechaDesde={fechaDesde}
                      fechaHasta={fechaHasta}
                      repairOrders={repairOrders}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls buildHref={paginationHref} hasNext={egresos.hasNext} page={page} />
      </section>
    </div>
  );
}
