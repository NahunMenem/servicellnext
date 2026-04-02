"use client";

import { useMemo, useState } from "react";
import { deleteEgresoAction, updateEgresoLinkAction } from "@/app/actions";
import { Modal } from "@/components/modal";
import type { RepairOrderListItem } from "@/lib/types";

type EgresoRow = {
  id: number;
  descripcion: string;
  equipo_id: number | null;
  nro_orden: string | null;
  nombre_cliente: string | null;
};

type EgresoActionsCellProps = {
  egreso: EgresoRow;
  fechaDesde: string;
  fechaHasta: string;
  repairOrders: RepairOrderListItem[];
};

export function EgresoActionsCell({
  egreso,
  fechaDesde,
  fechaHasta,
  repairOrders
}: EgresoActionsCellProps) {
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return repairOrders;
    }

    return repairOrders.filter((equipo) =>
      [
        equipo.nro_orden,
        equipo.nombre_cliente,
        equipo.marca,
        equipo.modelo,
        equipo.tipo_reparacion,
        equipo.estado
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [repairOrders, search]);

  return (
    <div className="egreso-actions-cell">
      <Modal
        description={`Edita el vinculo del egreso "${egreso.descripcion}".`}
        title="Editar vinculo"
        triggerClassName="button soft button-compact"
        triggerLabel="Editar"
      >
        <form action={updateEgresoLinkAction} className="form-grid">
          <input type="hidden" name="egreso_id" value={egreso.id} />
          <input type="hidden" name="fecha_desde" value={fechaDesde} />
          <input type="hidden" name="fecha_hasta" value={fechaHasta} />
          <div className="field full">
            <label>Buscar equipo</label>
            <input
              placeholder="Orden, cliente, marca, modelo, reparacion..."
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="field full">
            <label>Vincular a reparacion</label>
            <select name="equipo_id" defaultValue={String(egreso.equipo_id ?? "")}>
              <option value="">Sin vincular</option>
              {filteredOrders.map((equipo) => (
                <option key={equipo.id} value={equipo.id}>
                  {equipo.nro_orden} · {equipo.nombre_cliente} · {equipo.marca} {equipo.modelo}
                </option>
              ))}
            </select>
            <span className="muted">
              {filteredOrders.length} resultado{filteredOrders.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="field full">
            <label>Vinculo actual</label>
            <input
              disabled
              value={
                egreso.nro_orden ? `${egreso.nro_orden} · ${egreso.nombre_cliente ?? ""}` : "Sin vincular"
              }
            />
          </div>
          <div className="actions">
            <button className="button" type="submit">
              Guardar vinculo
            </button>
          </div>
        </form>
      </Modal>

      <form action={deleteEgresoAction}>
        <input type="hidden" name="egreso_id" value={egreso.id} />
        <input type="hidden" name="fecha_desde" value={fechaDesde} />
        <input type="hidden" name="fecha_hasta" value={fechaHasta} />
        <button className="button danger button-compact" type="submit">
          Eliminar
        </button>
      </form>
    </div>
  );
}
