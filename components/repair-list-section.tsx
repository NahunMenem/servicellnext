"use client";

import { useDeferredValue, useEffect, useState } from "react";
import {
  deleteEquipoAction,
  updateEquipoAction,
  updateEquipoStatusWithReturnAction
} from "@/app/actions";
import { Modal } from "@/components/modal";
import { PaginationControls } from "@/components/pagination-controls";
import {
  REPAIR_BRANDS,
  REPAIR_STATES,
  REPAIR_TECHNICIANS,
  REPAIR_TYPES
} from "@/lib/repair-options";
import { formatCurrency } from "@/lib/utils";
import { FileSignature, FileText, Pencil, Phone, Save, Trash2 } from "lucide-react";

type RepairListItem = {
  id: number;
  tipo_reparacion: string;
  marca: string;
  modelo: string;
  tecnico: string;
  monto: string;
  nombre_cliente: string;
  telefono: string;
  nro_orden: string;
  fecha: string;
  estado: string;
  observaciones: string | null;
  costo_vinculado: number;
  cantidad_costos_vinculados: number;
  detalle_costos_vinculados: string;
  ganancia_aproximada: number;
  firma_cliente?: string | null;
};

export function RepairListSection({
  equipos,
  fechaDesde,
  fechaHasta,
  hasNext,
  page
}: {
  equipos: RepairListItem[];
  fechaDesde: string;
  fechaHasta: string;
  hasNext: boolean;
  page: number;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [currentPage, setCurrentPage] = useState(page);
  const [items, setItems] = useState(equipos);
  const [currentHasNext, setCurrentHasNext] = useState(hasNext);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredQuery, fechaDesde, fechaHasta]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadEquipos() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/equipos/search?${new URLSearchParams({
            q: deferredQuery,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            page: String(currentPage)
          }).toString()}`,
          {
            signal: controller.signal,
            cache: "no-store"
          }
        );
        const data = (await response.json()) as { items: RepairListItem[]; hasNext: boolean };
        if (!cancelled) {
          setItems(data.items);
          setCurrentHasNext(data.hasNext);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setCurrentHasNext(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEquipos();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentPage, deferredQuery, fechaDesde, fechaHasta]);

  return (
    <section className="card stack">
      <div className="dashboard-section-title">
        <Phone size={18} strokeWidth={1.9} />
        <strong>Ultimos telefonos cargados</strong>
      </div>
      <div className="stock-search-row">
        <label className="field stock-search-field">
          <span>Buscar reparacion</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente, orden, marca, modelo, telefono o tipo"
            value={query}
          />
        </label>
        <div className="stock-search-meta muted">
          {loading ? "Buscando reparaciones..." : `${items.length} resultados visibles${query ? ` para "${query}"` : ""}`}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo Reparacion</th>
              <th>Observaciones</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Tecnico</th>
              <th>Monto</th>
              <th>Cliente</th>
              <th>Telefono</th>
              <th>N° Orden</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((equipo) => (
                <tr key={equipo.id}>
                  <td>{equipo.tipo_reparacion}</td>
                  <td>
                    <div>{equipo.observaciones || "-"}</div>
                    {equipo.cantidad_costos_vinculados ? (
                      <div className="muted" style={{ marginTop: 6 }}>
                        Repuestos vinculados: {equipo.cantidad_costos_vinculados}
                      </div>
                    ) : null}
                    {equipo.detalle_costos_vinculados ? (
                      <div className="muted" style={{ marginTop: 4 }}>
                        {equipo.detalle_costos_vinculados}
                      </div>
                    ) : null}
                  </td>
                  <td>{equipo.marca}</td>
                  <td>{equipo.modelo}</td>
                  <td>{equipo.tecnico}</td>
                  <td>
                    <strong>{formatCurrency(equipo.monto)}</strong>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Costo: {formatCurrency(equipo.costo_vinculado)}
                    </div>
                    <div className="muted">
                      Ganancia: {formatCurrency(equipo.ganancia_aproximada)}
                    </div>
                  </td>
                  <td>{equipo.nombre_cliente}</td>
                  <td>{equipo.telefono}</td>
                  <td>{equipo.nro_orden}</td>
                  <td>{equipo.fecha}</td>
                  <td>
                    <form action={updateEquipoStatusWithReturnAction} className="actions">
                      <input type="hidden" name="fecha_desde" value={fechaDesde} />
                      <input type="hidden" name="fecha_hasta" value={fechaHasta} />
                      <input type="hidden" name="nro_orden" value={equipo.nro_orden} />
                      <select name="estado" defaultValue={equipo.estado}>
                        {REPAIR_STATES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <button className="button soft" type="submit">
                        <Save size={15} strokeWidth={2} />
                        Guardar
                      </button>
                    </form>
                  </td>
                  <td>
                    <div className="actions">
                      <a className="button secondary" href={`/comprobante/${equipo.nro_orden}`} target="_blank">
                        <FileText size={15} strokeWidth={2} />
                        Comprobante
                      </a>
                      <a className="button secondary" href={`/firmar?nro_orden=${equipo.nro_orden}`}>
                        <FileSignature size={15} strokeWidth={2} />
                        Firmar
                      </a>
                      <Modal
                        description={`Edita la orden ${equipo.nro_orden}.`}
                        title="Editar reparacion"
                        triggerClassName="button soft"
                        triggerContent={
                          <span className="modal-trigger-inline">
                            <Pencil size={15} strokeWidth={2} />
                            Editar
                          </span>
                        }
                        triggerLabel="Editar"
                      >
                        <form action={updateEquipoAction} className="form-grid">
                          <input type="hidden" name="id" value={equipo.id} />
                          <div className="field">
                            <label>Tipo</label>
                            <select name="tipo_reparacion" defaultValue={equipo.tipo_reparacion}>
                              {REPAIR_TYPES.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Observaciones</label>
                            <textarea name="observaciones" defaultValue={equipo.observaciones ?? ""} rows={3} />
                          </div>
                          <div className="field">
                            <label>Marca</label>
                            <select name="marca" defaultValue={equipo.marca}>
                              {REPAIR_BRANDS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Modelo</label>
                            <input name="modelo" defaultValue={equipo.modelo} />
                          </div>
                          <div className="field">
                            <label>Tecnico</label>
                            <select name="tecnico" defaultValue={equipo.tecnico}>
                              {REPAIR_TECHNICIANS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Monto</label>
                            <input name="monto" type="number" step="0.01" defaultValue={equipo.monto} />
                          </div>
                          <div className="field">
                            <label>Cliente</label>
                            <input name="nombre_cliente" defaultValue={equipo.nombre_cliente} />
                          </div>
                          <div className="field">
                            <label>Telefono</label>
                            <input name="telefono" defaultValue={equipo.telefono} />
                          </div>
                          <div className="field">
                            <label>Estado</label>
                            <select name="estado" defaultValue={equipo.estado}>
                              {REPAIR_STATES.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="actions">
                            <button className="button soft" type="submit">
                              <Save size={15} strokeWidth={2} />
                              Guardar
                            </button>
                          </div>
                        </form>
                      </Modal>
                      <form action={deleteEquipoAction}>
                        <input type="hidden" name="id" value={equipo.id} />
                        <button className="button danger" type="submit">
                          <Trash2 size={15} strokeWidth={2} />
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12}>
                  <div className="cart-empty">No hay reparaciones que coincidan con la busqueda.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination-bar">
        <button
          className="button secondary"
          disabled={currentPage <= 1 || loading}
          onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
          type="button"
        >
          Anterior
        </button>
        <span className="muted">Pagina {currentPage}</span>
        <button
          className="button secondary"
          disabled={!currentHasNext || loading}
          onClick={() => setCurrentPage((value) => value + 1)}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}
