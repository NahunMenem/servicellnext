import { PaginationControls } from "@/components/pagination-controls";
import { getLowStockProducts } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

export default async function ProductosPorAgotarsePage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const productos = await getLowStockProducts(page);

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
    </div>
  );
}
