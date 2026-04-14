import { getRecentAuditLogs } from "@/lib/audit";
import { PaginationControls } from "@/components/pagination-controls";
import { getLowStockProducts } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ProductosPorAgotarsePage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const [productos, auditoria] = await Promise.all([getLowStockProducts(page), getRecentAuditLogs(20)]);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Productos por agotarse</h1>
          <p>Alertas de stock bajo para productos con dos unidades o menos.</p>
        </div>
      </div>

      <section className="card stack">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Codigo</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              {productos.items.map((producto) => (
                <tr key={producto.id}>
                  <td>{producto.nombre}</td>
                  <td>{producto.codigo_barras}</td>
                  <td>{producto.stock}</td>
                  <td>{formatCurrency(producto.precio)}</td>
                  <td>{formatCurrency(producto.precio_costo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls buildHref={(nextPage) => `/productos_por_agotarse?page=${nextPage}`} hasNext={productos.hasNext} page={page} />
      </section>

      <section className="card stack">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>Auditoria reciente</h2>
            <p>Ultimos movimientos registrados con usuario, fecha y hora de Argentina.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {auditoria.length ? (
                auditoria.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>
                    <td>{item.username}</td>
                    <td>{item.summary}</td>
                    <td>
                      <div className="muted">
                        {item.entity_type}
                        {item.entity_id ? ` #${item.entity_id}` : ""}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="cart-empty">Todavia no hay movimientos auditados.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
