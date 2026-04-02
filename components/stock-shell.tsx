"use client";

import { useDeferredValue, useEffect, useState } from "react";
import {
  addStockAction,
  createProductAction,
  deleteZeroStockProductsAction,
  deleteProductAction,
  updateProductAction
} from "@/app/actions";
import { Modal } from "@/components/modal";
import type { ProductoListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type StockResponse = {
  items: ProductoListItem[];
  hasNext: boolean;
};

export function StockShell({
  initialProducts,
  initialQuery,
  initialPage,
  initialHasNext,
  role
}: {
  initialProducts: ProductoListItem[];
  initialQuery: string;
  initialPage: number;
  initialHasNext: boolean;
  role: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(initialPage);
  const [products, setProducts] = useState(initialProducts);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/productos/search?q=${encodeURIComponent(deferredQuery)}&page=${page}`,
          {
            signal: controller.signal,
            cache: "no-store"
          }
        );
        const data = (await response.json()) as StockResponse;
        if (!cancelled) {
          setProducts(data.items);
          setHasNext(data.hasNext);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setHasNext(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [deferredQuery, page]);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Stock y productos</h1>
          <p>Alta, edicion, eliminacion y carga de stock sobre la tabla `productos`.</p>
        </div>
      </div>
      <section className="card stack">
        <div className="stock-head">
          <div className="stock-head-copy">
            <strong>Catalogo</strong>
            <span className="muted">Busca en vivo por nombre o codigo de barras.</span>
          </div>
          <div className="actions">
            <Modal
              description="Se borraran todos los productos con stock en 0 que no tengan historial asociado."
              title="Confirmar borrado masivo"
              triggerClassName="button danger"
              triggerLabel="Borrar stock 0"
            >
              <form action={deleteZeroStockProductsAction} className="stack">
                <p className="muted">Esta accion eliminara todos los productos con stock 0 disponibles para borrar.</p>
                <div className="actions">
                  <button className="button danger" type="submit">
                    Si, borrar todo el stock 0
                  </button>
                </div>
              </form>
            </Modal>
            <Modal
              description="Agrega un producto nuevo sin salir del listado."
              title="Nuevo producto"
              triggerLabel="Agregar producto"
            >
              <form action={createProductAction} className="form-grid">
                <div className="field full">
                  <label>Nombre</label>
                  <input name="nombre" required />
                </div>
                <div className="field">
                  <label>Codigo de barras</label>
                  <input name="codigo_barras" />
                </div>
                <div className="field">
                  <label>Stock</label>
                  <input name="stock" type="number" min={0} defaultValue={0} />
                </div>
                <div className="field">
                  <label>Precio venta</label>
                  <input name="precio" type="number" step="0.01" />
                </div>
                <div className="field">
                  <label>Precio costo</label>
                  <input name="precio_costo" type="number" step="0.01" />
                </div>
                <div className="actions">
                  <button className="button" type="submit">
                    Guardar producto
                  </button>
                </div>
              </form>
            </Modal>
          </div>
        </div>

        <div className="stock-search-row">
          <label className="field stock-search-field">
            <span>Buscar producto</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Escribe nombre o codigo de barras"
              value={query}
            />
          </label>
          <div className="stock-search-meta muted">
            {loading
              ? "Buscando productos..."
              : `${products.length} productos visibles${query ? ` para "${query}"` : ""}`}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Venta</th>
                <th>Costo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length ? (
                products.map((producto) => (
                  <tr key={producto.id}>
                    <td>
                      <strong>{producto.nombre}</strong>
                      <div className="muted">{producto.codigo_barras}</div>
                    </td>
                    <td>{producto.stock}</td>
                    <td>{formatCurrency(producto.precio)}</td>
                    <td>{formatCurrency(producto.precio_costo)}</td>
                    <td>
                      <div className="actions">
                        <Modal
                          description={`Edita ${producto.nombre} o corrige sus valores.`}
                          title="Editar producto"
                          triggerClassName="button soft"
                          triggerLabel="Editar"
                        >
                          <form action={updateProductAction} className="form-grid">
                            <input type="hidden" name="producto_id" value={producto.id} />
                            <div className="field full">
                              <label>Nombre</label>
                              <input name="nombre" defaultValue={producto.nombre} />
                            </div>
                            <div className="field">
                              <label>Codigo</label>
                              <input name="codigo_barras" defaultValue={producto.codigo_barras} />
                            </div>
                            <div className="field">
                              <label>Stock</label>
                              <input
                                name="stock"
                                type="number"
                                defaultValue={producto.stock}
                                disabled={role !== "admin"}
                              />
                              {role !== "admin" ? <input type="hidden" name="stock" value={producto.stock} /> : null}
                              {role !== "admin" ? (
                                <span className="muted" style={{ fontSize: "0.8rem" }}>
                                  Solo el perfil admin puede editar el stock desde este modal.
                                </span>
                              ) : null}
                            </div>
                            <div className="field">
                              <label>Precio</label>
                              <input name="precio" type="number" step="0.01" defaultValue={producto.precio} />
                            </div>
                            <div className="field">
                              <label>Costo</label>
                              <input
                                name="precio_costo"
                                type="number"
                                step="0.01"
                                defaultValue={producto.precio_costo}
                              />
                            </div>
                            <div className="actions">
                              <button className="button soft" type="submit">
                                Guardar cambios
                              </button>
                            </div>
                          </form>
                        </Modal>
                        <Modal
                          description={`Suma unidades al stock actual de ${producto.nombre}.`}
                          title="Agregar stock"
                          triggerClassName="button secondary"
                          triggerLabel="Sumar stock"
                        >
                          <form action={addStockAction} className="actions">
                            <input type="hidden" name="producto_id" value={producto.id} />
                            <input type="number" name="cantidad" defaultValue={1} min={1} style={{ width: 80 }} />
                            <button className="button secondary" type="submit">
                              Sumar stock
                            </button>
                          </form>
                        </Modal>
                        <Modal
                          description={`Se eliminara ${producto.nombre} si no tiene historial bloqueante.`}
                          title="Confirmar eliminacion"
                          triggerClassName="button danger"
                          triggerLabel="Eliminar"
                        >
                          <form action={deleteProductAction} className="stack">
                            <input type="hidden" name="producto_id" value={producto.id} />
                            <p className="muted">Estas seguro de que quieres eliminar este producto?</p>
                            <div className="actions">
                              <button className="button danger" type="submit">
                                Si, eliminar producto
                              </button>
                            </div>
                          </form>
                        </Modal>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="cart-empty">No hay productos que coincidan con la busqueda.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <button
            className="button secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Anterior
          </button>
          <span className="muted">Pagina {page}</span>
          <button
            className="button secondary"
            disabled={!hasNext || loading}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </section>
    </div>
  );
}
