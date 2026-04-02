"use client";

import { useDeferredValue, useEffect, useState } from "react";
import {
  addManualItemAction,
  addProductAction,
  addRepairOrderAction,
  clearCartAction,
  registerSaleAction
} from "@/app/actions";
import { Modal } from "@/components/modal";
import type { CartItem, ProductoListItem, RepairOrderListItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function RegistrarVentaShell({
  carrito,
  initialProducts,
  initialQuery,
  lastSaleAvailable,
  repairOrders
}: {
  carrito: CartItem[];
  initialProducts: ProductoListItem[];
  initialQuery: string;
  lastSaleAvailable: boolean;
  repairOrders: RepairOrderListItem[];
}) {
  const REPAIR_PAGE_SIZE = 5;
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [repairQuery, setRepairQuery] = useState("");
  const [repairPage, setRepairPage] = useState(1);
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);

  function getItemSourceType(item: CartItem) {
    if (item.sourceType) return item.sourceType;
    return item.id !== null ? "producto" : "manual";
  }

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const totalItems = carrito.length;
  const totalUnits = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const serviciosManuales = carrito.filter((item) => getItemSourceType(item) === "manual").length;
  const equiposEnCarrito = carrito.filter((item) => getItemSourceType(item) === "equipo").length;
  const filteredRepairOrders = repairOrders.filter((item) => {
    const term = repairQuery.trim().toLowerCase();
    if (!term) return true;
    return [
      item.nro_orden,
      item.nombre_cliente,
      item.marca,
      item.modelo,
      item.tipo_reparacion,
      item.estado
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  const totalRepairPages = Math.max(1, Math.ceil(filteredRepairOrders.length / REPAIR_PAGE_SIZE));
  const currentRepairPage = Math.min(repairPage, totalRepairPages);
  const paginatedRepairOrders = filteredRepairOrders.slice(
    (currentRepairPage - 1) * REPAIR_PAGE_SIZE,
    currentRepairPage * REPAIR_PAGE_SIZE
  );

  function getItemTypeLabel(item: CartItem) {
    if (getItemSourceType(item) === "equipo") return "Reparacion cargada";
    if (getItemSourceType(item) === "producto") return "Producto";
    return "Servicio manual";
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      try {
        const response = await fetch(`/api/productos/search?q=${encodeURIComponent(deferredQuery)}`, {
          signal: controller.signal,
          cache: "no-store"
        });
        const data = (await response.json()) as { items: ProductoListItem[] };
        if (!cancelled) {
          setProducts(data.items);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
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
  }, [deferredQuery]);

  useEffect(() => {
    setRepairPage(1);
  }, [repairQuery]);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Registrar venta</h1>
          <p>Busca productos en vivo y usa acciones claras arriba para una caja mas rapida.</p>
        </div>
      </div>

      <section className="card stack">
        <div className="ventas-toolbar">
          <div className="ventas-toolbar-left">
            <Modal
              description="Agrega un servicio tecnico o item manual sin salir de la venta."
              title="Agregar servicio manual"
              triggerClassName="button"
              triggerContent={
                <span className="modal-trigger-inline">
                  <span className="modal-trigger-icon">+</span>
                  Servicio manual
                </span>
              }
              triggerLabel="Servicio manual"
            >
              <form action={addManualItemAction} className="form-grid">
                <div className="field full">
                  <label>Nombre</label>
                  <input name="nombre_manual" required />
                </div>
                <div className="field">
                  <label>Precio</label>
                  <input name="precio_manual" type="number" step="0.01" required />
                </div>
                <div className="field">
                  <label>Cantidad</label>
                  <input name="cantidad_manual" type="number" min={1} defaultValue={1} required />
                </div>
                <div className="actions">
                  <button className="button" type="submit">
                    Agregar al carrito
                  </button>
                </div>
              </form>
            </Modal>
          </div>
          <div className="ventas-toolbar-right">
            {lastSaleAvailable ? (
              <a className="button secondary" href="/ticket/venta" target="_blank">
                Imprimir ticket
              </a>
            ) : null}
            <form action={clearCartAction}>
              <button className="button danger" type="submit">
                Vaciar carrito
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="card cart-highlight stack">
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <strong style={{ fontSize: "1.05rem" }}>Carrito actual</strong>
          <span className="pill">Total: {formatCurrency(total)}</span>
        </div>

        <div className="cart-summary">
          <div className="card stat">
            <small>Items cargados</small>
            <strong>{totalItems}</strong>
          </div>
          <div className="card stat">
            <small>Unidades</small>
            <strong>{totalUnits}</strong>
          </div>
          <div className="card stat">
            <small>Servicios manuales</small>
            <strong>{serviciosManuales}</strong>
          </div>
          <div className="card stat">
            <small>Reparaciones cargadas</small>
            <strong>{equiposEnCarrito}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {carrito.length ? (
                carrito.map((item, index) => (
                  <tr key={`${item.nombre}-${index}`}>
                    <td>
                      <strong>{item.nombre}</strong>
                      <div className="muted">{getItemTypeLabel(item)}</div>
                    </td>
                    <td>{item.cantidad}</td>
                    <td>{formatCurrency(item.precio)}</td>
                    <td>{formatCurrency(item.precio * item.cantidad)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="cart-empty">El carrito esta vacio. Agrega productos, servicios manuales o reparaciones.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className="card"
          style={{
            background: "rgba(0,0,0,0.18)",
            borderColor: "rgba(10, 230, 199, 0.18)"
          }}
        >
          <div className="stack">
            <strong>Registrar cobro</strong>
            <form action={registerSaleAction} className="form-grid">
              <div className="field full">
                <label>DNI cliente</label>
                <input name="dni_cliente" />
              </div>
              <div className="field">
                <label>Tipo de pago 1</label>
                <select name="tipo_pago_1" defaultValue="efectivo">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="mercado pago">Mercado Pago</option>
                </select>
              </div>
              <div className="field">
                <label>Monto 1</label>
                <input name="monto_pago_1" type="number" step="0.01" defaultValue={total} />
              </div>
              <div className="field">
                <label>Tipo de pago 2</label>
                <select name="tipo_pago_2" defaultValue="">
                  <option value="">Sin segundo pago</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="mercado pago">Mercado Pago</option>
                </select>
              </div>
              <div className="field">
                <label>Monto 2</label>
                <input name="monto_pago_2" type="number" step="0.01" defaultValue={0} />
              </div>
              <div className="field full">
                <label>Total del carrito</label>
                <input value={formatCurrency(total)} disabled />
              </div>
              <div className="actions">
                <button className="button" type="submit">
                  Confirmar venta
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="stack" style={{ gap: "0.6rem" }}>
          <div className="ventas-search">
            <label className="field">
              <span>Buscar reparacion/equipo</span>
              <input
                onChange={(event) => setRepairQuery(event.target.value)}
                placeholder="Orden, cliente, marca, modelo o tipo"
                value={repairQuery}
              />
            </label>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {`${filteredRepairOrders.length} reparaciones disponibles`}
            </div>
          </div>
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <strong>Agregar reparacion ya cargada</strong>
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              Solo se muestran equipos que todavia no figuran como retirados
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRepairOrders.length ? (
                paginatedRepairOrders.map((equipo) => {
                  const alreadyInCart = carrito.some(
                    (item) => getItemSourceType(item) === "equipo" && item.sourceId === equipo.id
                  );

                  return (
                    <tr key={equipo.id}>
                      <td>
                        <strong>{equipo.nro_orden}</strong>
                        <div className="muted">{equipo.fecha}</div>
                      </td>
                      <td>{equipo.nombre_cliente}</td>
                      <td>
                        <strong>
                          {equipo.marca} {equipo.modelo}
                        </strong>
                        <div className="muted">{equipo.tipo_reparacion}</div>
                      </td>
                      <td>{equipo.estado}</td>
                      <td>{formatCurrency(Number(equipo.monto))}</td>
                      <td>
                        <form action={addRepairOrderAction}>
                          <input type="hidden" name="equipo_id" value={equipo.id} />
                          <button className="button soft" disabled={alreadyInCart} type="submit">
                            {alreadyInCart ? "En carrito" : "Agregar"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="cart-empty">No hay reparaciones que coincidan con la busqueda.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Pagina {currentRepairPage} de {totalRepairPages}
          </span>
          <div className="actions">
            <button
              className="button secondary"
              disabled={currentRepairPage <= 1}
              onClick={() => setRepairPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              Atras
            </button>
            <button
              className="button secondary"
              disabled={currentRepairPage >= totalRepairPages}
              onClick={() => setRepairPage((page) => Math.min(totalRepairPages, page + 1))}
              type="button"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="stack" style={{ gap: "0.6rem" }}>
          <div className="ventas-search">
            <label className="field">
              <span>Buscar producto</span>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribe nombre o codigo de barras"
                value={query}
              />
            </label>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {loading ? "Buscando..." : `${products.length} resultados visibles`}
            </div>
          </div>
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <strong>Agregar producto</strong>
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              Se actualiza mientras escribes
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Precio</th>
                <th>Accion</th>
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
                    <td>
                      <form action={addProductAction} className="actions">
                        <input type="hidden" name="producto_id" value={producto.id} />
                        <input type="number" name="cantidad" defaultValue={1} min={1} style={{ width: 80 }} />
                        <button className="button soft" type="submit">
                          Agregar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="cart-empty">No hay productos que coincidan con la busqueda.</div>
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
