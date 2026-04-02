import { PaginationControls } from "@/components/pagination-controls";
import { getTopProducts } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

export default async function ProductosMasVendidosPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const { items, totalVentas, hasNext } = await getTopProducts(page);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Productos mas vendidos</h1>
          <p>Top 5 calculado con la misma logica agregada de la tabla `ventas`.</p>
        </div>
      </div>

      <section className="card stack">
        <div className="pill">Unidades totales vendidas: {totalVentas}</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Unidades</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {items.map((producto) => (
                <tr key={producto.nombre}>
                  <td>{producto.nombre}</td>
                  <td>{formatCurrency(producto.precio)}</td>
                  <td>{producto.cantidadVendida}</td>
                  <td>{producto.porcentaje.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls buildHref={(nextPage) => `/productos_mas_vendidos?page=${nextPage}`} hasNext={hasNext} page={page} />
      </section>
    </div>
  );
}
