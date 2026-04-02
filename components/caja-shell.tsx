"use client";

import { useState } from "react";
import {
  Banknote,
  Calculator,
  CalendarDays,
  CreditCard,
  Landmark,
  PiggyBank,
  Receipt,
  Wallet
} from "lucide-react";
import { saveCajaSemanaAction } from "@/app/actions";
import { PaginationControls } from "@/components/pagination-controls";
import { formatCurrency } from "@/lib/utils";

type CajaData = {
  egresos: Array<{
    id: number;
    descripcion: string;
    monto: string;
    tipo_pago: string;
    fecha: string;
  }>;
  hasNextEgresos: boolean;
  semanaInicio: string;
  efectivoInicial: number;
  efectivoEsperado: number;
  ingresosEfectivoSemana: number;
  egresosEfectivoSemana: number;
  ingresosTotales: number;
  egresosTotales: number;
  ingresosPorPago: Record<string, number>;
  egresosPorPago: Record<string, number>;
  netoPorPago: Record<string, number>;
};

const PAYMENT_META: Record<string, { label: string; icon: typeof Wallet }> = {
  efectivo: { label: "Efectivo", icon: Banknote },
  transferencia: { label: "Transferencia", icon: Landmark },
  tarjeta: { label: "Tarjeta", icon: CreditCard },
  "mercado pago": { label: "Mercado Pago", icon: Wallet }
};

function getPaymentMeta(tipo: string) {
  return PAYMENT_META[tipo] ?? { label: tipo, icon: Wallet };
}

export function CajaShell({
  caja,
  fechaDesde,
  fechaHasta,
  page
}: {
  caja: CajaData;
  fechaDesde: string;
  fechaHasta: string;
  page: number;
}) {
  const [efectivoContado, setEfectivoContado] = useState(String(caja.efectivoEsperado || 0));
  const contado = Number(efectivoContado || 0);
  const diferencia = contado - caja.efectivoEsperado;
  const estadoCierre =
    Math.abs(diferencia) < 0.009 ? "ok" : diferencia > 0 ? "sobrante" : "faltante";

  const metodos = Array.from(
    new Set([
      ...Object.keys(caja.ingresosPorPago),
      ...Object.keys(caja.egresosPorPago),
      ...Object.keys(caja.netoPorPago),
      "efectivo"
    ])
  );

  const buildHref = (nextPage: number) =>
    `/caja?${new URLSearchParams({
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      page: String(nextPage)
    }).toString()}`;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Caja</h1>
          <p>Controla por metodo de pago, registra el efectivo inicial semanal y valida si la caja cierra.</p>
        </div>
        <form className="dashboard-filter-grid">
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
              <CalendarDays size={16} />
              Filtrar caja
            </button>
          </div>
        </form>
      </div>

      <div className="kpis">
        <section className="card dashboard-kpi">
          <div className="dashboard-kpi-icon success">
            <PiggyBank size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Ingresos del periodo</small>
            <strong>{formatCurrency(caja.ingresosTotales)}</strong>
          </div>
        </section>
        <section className="card dashboard-kpi">
          <div className="dashboard-kpi-icon danger">
            <Receipt size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Egresos del periodo</small>
            <strong>{formatCurrency(caja.egresosTotales)}</strong>
          </div>
        </section>
        <section className="card dashboard-kpi">
          <div className="dashboard-kpi-icon amber">
            <Banknote size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Efectivo inicial semana</small>
            <strong>{formatCurrency(caja.efectivoInicial)}</strong>
          </div>
        </section>
        <section className="card dark dashboard-kpi">
          <div className="dashboard-kpi-icon">
            <Calculator size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Efectivo esperado en caja</small>
            <strong>{formatCurrency(caja.efectivoEsperado)}</strong>
          </div>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <div className="dashboard-section-title">
            <Banknote size={18} />
            <strong>Apertura semanal de efectivo</strong>
          </div>
          <p className="muted">
            Semana tomada desde <strong>{caja.semanaInicio}</strong>. Puedes cargarla y editarla cuando cambie.
          </p>
          <div className="dashboard-breakdown-grid">
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <Banknote size={16} />
                Apertura semanal
              </div>
              <strong>{formatCurrency(caja.efectivoInicial)}</strong>
            </div>
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <PiggyBank size={16} />
                Ventas en efectivo
              </div>
              <strong>{formatCurrency(caja.ingresosEfectivoSemana)}</strong>
            </div>
            <div className="dashboard-breakdown-item full">
              <div className="dashboard-breakdown-label">
                <Receipt size={16} />
                Egresos en efectivo
              </div>
              <strong>{formatCurrency(caja.egresosEfectivoSemana)}</strong>
            </div>
          </div>
          <form action={saveCajaSemanaAction} className="form-grid">
            <input type="hidden" name="semana_inicio" value={caja.semanaInicio} />
            <input type="hidden" name="fecha_desde" value={fechaDesde} />
            <input type="hidden" name="fecha_hasta" value={fechaHasta} />
            <div className="field">
              <label>Efectivo con el que inicio la semana</label>
              <input name="efectivo_inicial" type="number" step="0.01" defaultValue={caja.efectivoInicial} />
            </div>
            <div className="actions" style={{ alignItems: "end" }}>
              <button className="button" type="submit">
                Guardar efectivo inicial
              </button>
            </div>
          </form>
        </section>

        <section className="card stack">
          <div className="dashboard-section-title">
            <Calculator size={18} />
            <strong>Control de cierre en efectivo</strong>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Efectivo contado ahora</label>
              <input
                onChange={(event) => setEfectivoContado(event.target.value)}
                step="0.01"
                type="number"
                value={efectivoContado}
              />
            </div>
            <div className={`cash-status ${estadoCierre}`}>
              <span className="cash-status-label">Estado</span>
              <strong>
                {estadoCierre === "ok"
                  ? "Caja cerrada exacta"
                  : estadoCierre === "sobrante"
                    ? `Sobra ${formatCurrency(diferencia)}`
                    : `Falta ${formatCurrency(Math.abs(diferencia))}`}
              </strong>
              <span className="muted">Contado: {formatCurrency(contado)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="card stack">
        <div className="dashboard-section-title">
          <Wallet size={18} />
          <strong>Control por metodo de pago</strong>
        </div>
        <div className="payment-kpi-grid">
          {metodos.map((tipo) => {
            const meta = getPaymentMeta(tipo);
            const Icon = meta.icon;
            const ingresos = caja.ingresosPorPago[tipo] ?? 0;
            const egresos = caja.egresosPorPago[tipo] ?? 0;
            const neto = caja.netoPorPago[tipo] ?? 0;

            return (
              <article className="payment-kpi-card" key={tipo}>
                <div className="payment-kpi-head">
                  <span className="payment-kpi-icon">
                    <Icon size={18} />
                  </span>
                  <strong>{meta.label}</strong>
                </div>
                <div className="payment-kpi-values">
                  <div>
                    <span className="muted">Ingresa</span>
                    <strong>{formatCurrency(ingresos)}</strong>
                  </div>
                  <div>
                    <span className="muted">Sale</span>
                    <strong>{formatCurrency(egresos)}</strong>
                  </div>
                  <div>
                    <span className="muted">Neto</span>
                    <strong className={neto >= 0 ? "value-positive" : "value-negative"}>
                      {formatCurrency(neto)}
                    </strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <div className="dashboard-section-title">
          <Receipt size={18} />
          <strong>Egresos del periodo</strong>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripcion</th>
                <th>Metodo</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {caja.egresos.length ? (
                caja.egresos.map((egreso) => (
                  <tr key={egreso.id}>
                    <td>{egreso.fecha}</td>
                    <td>{egreso.descripcion}</td>
                    <td>{getPaymentMeta(egreso.tipo_pago).label}</td>
                    <td>{formatCurrency(egreso.monto)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="cart-empty">No hay egresos en el periodo seleccionado.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls buildHref={buildHref} hasNext={caja.hasNextEgresos} page={page} />
      </section>
    </div>
  );
}
