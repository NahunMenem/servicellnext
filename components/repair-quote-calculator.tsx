"use client";

import { useMemo, useState } from "react";
import type { SparePartPriceItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function parseMoney(value: string) {
  const normalized = value.replace(",", ".").trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

type RepairQuoteCalculatorProps = {
  spareParts: SparePartPriceItem[];
};

export function RepairQuoteCalculator({ spareParts }: RepairQuoteCalculatorProps) {
  const [tipoReparacion, setTipoReparacion] = useState("");
  const [marcaModelo, setMarcaModelo] = useState("");
  const [costoTecnico, setCostoTecnico] = useState("6000");
  const [costoRepuesto, setCostoRepuesto] = useState("15000");
  const [multiplicador, setMultiplicador] = useState("2.5");
  const [observaciones, setObservaciones] = useState("");
  const [repuestoQuery, setRepuestoQuery] = useState("");
  const [selectedRepuestoId, setSelectedRepuestoId] = useState("");

  const selectedRepuesto = useMemo(
    () => spareParts.find((item) => item.id === selectedRepuestoId) ?? null,
    [selectedRepuestoId, spareParts]
  );

  const filteredSpareParts = useMemo(() => {
    const query = repuestoQuery.trim().toLowerCase();

    if (!query) {
      return spareParts.slice(0, 200);
    }

    return spareParts
      .filter((item) => item.descripcion.toLowerCase().includes(query))
      .slice(0, 200);
  }, [repuestoQuery, spareParts]);

  const calculo = useMemo(() => {
    const tecnico = parseMoney(costoTecnico);
    const repuesto = parseMoney(costoRepuesto);
    const factor = parseMoney(multiplicador) || 0;
    const costoBase = tecnico + repuesto;
    const sugerido = costoBase * factor;

    return {
      tecnico,
      repuesto,
      factor,
      costoBase,
      sugerido
    };
  }, [costoRepuesto, costoTecnico, multiplicador]);

  return (
    <div className="stack">
      <section className="card stack">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <h1>Cotizar</h1>
            <p>
              Carga costo tecnico y costo de repuesto. El sistema suma ambos y calcula la cotizacion al
              cliente con multiplicador editable.
            </p>
          </div>
        </div>
      </section>

      <div className="grid cols-2">
        <section className="card stack">
          <strong>Datos de la reparacion</strong>
          <div className="form-grid">
            <label className="field full">
              <span>Tipo de reparacion</span>
              <input
                onChange={(event) => setTipoReparacion(event.target.value)}
                placeholder="Ej: Modulo, pin de carga, bateria"
                value={tipoReparacion}
              />
            </label>
            <label className="field full">
              <span>Marca / modelo</span>
              <input
                onChange={(event) => setMarcaModelo(event.target.value)}
                placeholder="Ej: Motorola A15"
                value={marcaModelo}
              />
            </label>
            <label className="field">
              <span>Costo tecnico</span>
              <input
                inputMode="decimal"
                onChange={(event) => setCostoTecnico(event.target.value)}
                value={costoTecnico}
              />
            </label>
            <label className="field">
              <span>Costo repuesto</span>
              <input
                inputMode="decimal"
                onChange={(event) => setCostoRepuesto(event.target.value)}
                value={costoRepuesto}
              />
            </label>
            <label className="field full">
              <span>Buscar repuesto en lista publica</span>
              <input
                onChange={(event) => setRepuestoQuery(event.target.value)}
                placeholder="Ej: modulo a15, bateria a03, pin de carga iphone"
                value={repuestoQuery}
              />
            </label>
            <label className="field full">
              <span>Seleccionar repuesto</span>
              <select
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedRepuestoId(nextId);

                  const item = spareParts.find((entry) => entry.id === nextId);
                  if (item) {
                    setCostoRepuesto(String(item.precio));
                  }
                }}
                value={selectedRepuestoId}
              >
                <option value="">Elegi un repuesto de la planilla publica</option>
                {filteredSpareParts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.descripcion} Â· {formatCurrency(item.precio)}
                  </option>
                ))}
              </select>
              <span className="muted">
                {filteredSpareParts.length} resultado{filteredSpareParts.length === 1 ? "" : "s"} visibles
              </span>
            </label>
            <label className="field">
              <span>Multiplicador</span>
              <input
                inputMode="decimal"
                onChange={(event) => setMultiplicador(event.target.value)}
                value={multiplicador}
              />
            </label>
            <label className="field full">
              <span>Observaciones</span>
              <textarea
                onChange={(event) => setObservaciones(event.target.value)}
                placeholder="Detalle de la falla, tiempo estimado, aclaraciones para el cliente"
                rows={4}
                value={observaciones}
              />
            </label>
          </div>
        </section>

        <section className="card stack">
          <strong>Resumen de cotizacion</strong>
          <div className="dashboard-breakdown-grid">
            <article className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">Costo tecnico</div>
              <strong>{formatCurrency(calculo.tecnico)}</strong>
              <span className="muted">Editable segun complejidad o aumento</span>
            </article>
            <article className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">Costo repuesto</div>
              <strong>{formatCurrency(calculo.repuesto)}</strong>
              <span className="muted">Valor actual del repuesto usado en la cuenta</span>
            </article>
            <article className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">Costo base</div>
              <strong>{formatCurrency(calculo.costoBase)}</strong>
              <span className="muted">Tecnico + repuesto</span>
            </article>
            <article className="dashboard-breakdown-item dashboard-breakdown-item-emphasis">
              <div className="dashboard-breakdown-label">Precio sugerido al cliente</div>
              <strong>{formatCurrency(calculo.sugerido)}</strong>
              <span className="muted">({formatCurrency(calculo.costoBase)}) x {calculo.factor || 0}</span>
            </article>
          </div>

          <div className="card stack" style={{ background: "rgba(0,0,0,0.18)" }}>
            <strong>Vista rapida</strong>
            <div className="muted">
              <div>Reparacion: {tipoReparacion || "-"}</div>
              <div>Equipo: {marcaModelo || "-"}</div>
              <div>Repuesto elegido: {selectedRepuesto?.descripcion || "-"}</div>
              <div>Observaciones: {observaciones || "-"}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

