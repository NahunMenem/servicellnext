import { createMercaderiaFalladaAction } from "@/app/actions";
import { Modal } from "@/components/modal";
import { PaginationControls } from "@/components/pagination-controls";
import { getMercaderiaFallada, getProductos } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";

export default async function MercaderiaFalladaPage({
  searchParams
}: {
  searchParams: Promise<{ busqueda?: string; page?: string }>;
}) {
  const params = await searchParams;
  const busqueda = params.busqueda ?? "";
  const page = parsePage(params.page);
  const [productos, historial] = await Promise.all([
    getProductos(busqueda, 1),
    getMercaderiaFallada(page)
  ]);
  const buildHref = (nextPage: number) =>
    `/mercaderia_fallada?${new URLSearchParams({
      ...(busqueda ? { busqueda } : {}),
      page: String(nextPage)
    }).toString()}`;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Mercaderia fallada</h1>
          <p>Descuenta stock y deja historial de productos fallados con descripcion.</p>
        </div>
        <form className="actions">
          <input name="busqueda" defaultValue={busqueda} placeholder="Buscar producto" />
          <button className="button secondary" type="submit">
            Buscar
          </button>
        </form>
      </div>

      <section className="card stack">
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <strong>Historial</strong>
            <Modal
              description="Registra mercaderia fallada sin salir del historial."
              title="Registrar mercaderia fallada"
              triggerLabel="Agregar fallada"
            >
              <form action={createMercaderiaFalladaAction} className="form-grid">
                <div className="field full">
                  <label>Producto</label>
                  <select name="producto_id">
                    {productos.items.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} | stock {producto.stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Cantidad</label>
                  <input name="cantidad" type="number" min={1} defaultValue={1} />
                </div>
                <div className="field full">
                  <label>Descripcion</label>
                  <textarea name="descripcion" required />
                </div>
                <div className="actions">
                  <button className="button" type="submit">
                    Descontar del stock
                  </button>
                </div>
              </form>
            </Modal>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Fecha</th>
                  <th>Descripcion</th>
                </tr>
              </thead>
              <tbody>
                {historial.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.cantidad}</td>
                    <td>{formatDate(item.fecha)}</td>
                    <td>{item.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls buildHref={buildHref} hasNext={historial.hasNext} page={page} />
      </section>
    </div>
  );
}
