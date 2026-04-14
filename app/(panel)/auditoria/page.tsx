import { redirect } from "next/navigation";
import { getAuditLogs } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";

function buildHref(params: {
  page: number;
  username?: string;
  action?: string;
  entity_type?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}) {
  const query = new URLSearchParams();
  if (params.username) query.set("username", params.username);
  if (params.action) query.set("action", params.action);
  if (params.entity_type) query.set("entity_type", params.entity_type);
  if (params.fecha_desde) query.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.set("fecha_hasta", params.fecha_hasta);
  query.set("page", String(params.page));
  return `/auditoria?${query.toString()}`;
}

export default async function AuditoriaPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string;
    username?: string;
    action?: string;
    entity_type?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }>;
}) {
  const session = await requireSession();
  if (session.role !== "admin") {
    redirect("/inicio");
  }

  const params = await searchParams;
  const page = parsePage(params.page);
  const username = params.username ?? "";
  const action = params.action ?? "";
  const entityType = params.entity_type ?? "";
  const fechaDesde = params.fecha_desde ?? "";
  const fechaHasta = params.fecha_hasta ?? "";
  const logs = await getAuditLogs({
    page,
    username,
    action,
    entityType,
    fechaDesde,
    fechaHasta
  });

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Auditoria</h1>
          <p>Historial completo de movimientos sensibles con usuario, fecha y hora argentina.</p>
        </div>
      </div>

      <section className="card stack">
        <form className="dashboard-filter-grid">
          <label className="field">
            <span>Usuario</span>
            <input name="username" defaultValue={username} placeholder="Ej: caja1" />
          </label>
          <label className="field">
            <span>Accion</span>
            <select name="action" defaultValue={action}>
              <option value="">Todas</option>
              <option value="crear">Crear</option>
              <option value="editar">Editar</option>
              <option value="eliminar">Eliminar</option>
              <option value="eliminar_masivo">Eliminar masivo</option>
              <option value="anular">Anular</option>
              <option value="sumar_stock">Sumar stock</option>
              <option value="descontar_fallada">Descontar fallada</option>
              <option value="cambiar_estado">Cambiar estado</option>
              <option value="guardar">Guardar</option>
            </select>
          </label>
          <label className="field">
            <span>Entidad</span>
            <select name="entity_type" defaultValue={entityType}>
              <option value="">Todas</option>
              <option value="producto">Producto</option>
              <option value="venta">Venta</option>
              <option value="reparacion_venta">Reparacion venta</option>
              <option value="equipo">Reparacion</option>
              <option value="egreso">Egreso</option>
              <option value="caja_semanal">Caja semanal</option>
            </select>
          </label>
          <label className="field">
            <span>Fecha desde</span>
            <input type="date" name="fecha_desde" defaultValue={fechaDesde} />
          </label>
          <label className="field">
            <span>Fecha hasta</span>
            <input type="date" name="fecha_hasta" defaultValue={fechaHasta} />
          </label>
          <div className="actions" style={{ alignItems: "end" }}>
            <button className="button secondary" type="submit">
              Filtrar
            </button>
          </div>
        </form>
      </section>

      <section className="card stack">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Entidad</th>
                <th>Resumen</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.items.length ? (
                logs.items.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>
                    <td>{item.username}</td>
                    <td>{item.action}</td>
                    <td>
                      {item.entity_type}
                      {item.entity_id ? ` #${item.entity_id}` : ""}
                    </td>
                    <td>{item.summary}</td>
                    <td>
                      <span className="muted audit-detail">{item.detail ?? "-"}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="cart-empty">No hay movimientos para los filtros elegidos.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <a
            className={`button secondary${page <= 1 ? " disabled-link" : ""}`}
            href={page <= 1 ? "#" : buildHref({ page: Math.max(1, page - 1), username, action, entity_type: entityType, fecha_desde: fechaDesde, fecha_hasta: fechaHasta })}
          >
            Anterior
          </a>
          <span className="muted">Pagina {page}</span>
          <a
            className={`button secondary${!logs.hasNext ? " disabled-link" : ""}`}
            href={!logs.hasNext ? "#" : buildHref({ page: page + 1, username, action, entity_type: entityType, fecha_desde: fechaDesde, fecha_hasta: fechaHasta })}
          >
            Siguiente
          </a>
        </div>
      </section>
    </div>
  );
}
