import {
  createSistemaMensualAction,
  registerSistemaPagoAction,
  updateSistemaMensualAction
} from "@/app/actions";
import { requireSession } from "@/lib/auth";
import { getSistemaPagos, getSistemasMensuales } from "@/lib/sistemas-mensuales";
import { formatCurrency, toInputDate } from "@/lib/utils";

function statusLabel(activo: boolean, diasRestantes: number) {
  if (!activo) return "Suspendido";
  if (diasRestantes < 0) return "Vencido";
  if (diasRestantes === 0) return "Vence hoy";
  if (diasRestantes <= 5) return `Vence en ${diasRestantes} dias`;
  return `Activo: ${diasRestantes} dias`;
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export default async function SistemasMensualesPage() {
  const session = await requireSession();
  const [sistemas, pagos] = await Promise.all([getSistemasMensuales(), getSistemaPagos()]);
  const today = toInputDate(new Date());
  const currentMonth = today.slice(0, 7);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Sistemas mensuales</h1>
          <p>Administra clientes con abono mensual, vencimientos y pagos registrados.</p>
        </div>
      </div>

      {session.role === "admin" ? (
        <section className="card stack">
          <strong>Nuevo sistema vendido</strong>
          <form action={createSistemaMensualAction} className="form-grid">
            <div className="field">
              <label>Cliente</label>
              <input name="nombre_cliente" placeholder="Alejandro Vega" required />
            </div>
            <div className="field">
              <label>Slug</label>
              <input name="sistema_slug" placeholder="alejandro-vega" />
            </div>
            <div className="field">
              <label>Schema DB</label>
              <input name="db_schema" placeholder="alejandro_vega" required />
            </div>
            <div className="field">
              <label>URL sistema</label>
              <input name="url_sistema" placeholder="https://..." />
            </div>
            <div className="field">
              <label>Monto mensual</label>
              <input min="0" name="monto_mensual" step="0.01" type="number" required />
            </div>
            <div className="field">
              <label>Fecha vencimiento</label>
              <input name="fecha_vencimiento" type="date" required />
            </div>
            <div className="field full">
              <label>Notas</label>
              <textarea name="notas" placeholder="Datos internos, contacto, condiciones..." />
            </div>
            <div className="actions">
              <button className="button" type="submit">
                Crear sistema
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card stack">
        <strong>Sistemas activos y vendidos</strong>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Schema</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Total pagado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sistemas.map((sistema) => (
                <tr key={sistema.id}>
                  <td>
                    <strong>{sistema.nombre_cliente}</strong>
                    <br />
                    <span className="muted">{sistema.url_sistema || sistema.sistema_slug}</span>
                  </td>
                  <td>{sistema.db_schema}</td>
                  <td>{formatCurrency(sistema.monto_mensual)}</td>
                  <td>{formatDateOnly(sistema.fecha_vencimiento)}</td>
                  <td>
                    <span className="pill">{statusLabel(sistema.activo, sistema.dias_restantes)}</span>
                  </td>
                  <td>
                    {formatCurrency(sistema.total_pagado)}
                    <br />
                    <span className="muted">Ultimo: {formatDateOnly(sistema.ultimo_pago)}</span>
                  </td>
                  <td>
                    <details>
                      <summary className="button secondary">Administrar</summary>
                      <div className="stack" style={{ marginTop: 12, minWidth: 420 }}>
                        <form action={updateSistemaMensualAction} className="form-grid">
                          <input name="sistema_id" type="hidden" value={sistema.id} />
                          <div className="field">
                            <label>Cliente</label>
                            <input name="nombre_cliente" required defaultValue={sistema.nombre_cliente} />
                          </div>
                          <div className="field">
                            <label>Slug</label>
                            <input name="sistema_slug" required defaultValue={sistema.sistema_slug} />
                          </div>
                          <div className="field">
                            <label>Schema</label>
                            <input name="db_schema" required defaultValue={sistema.db_schema} />
                          </div>
                          <div className="field">
                            <label>URL</label>
                            <input name="url_sistema" defaultValue={sistema.url_sistema ?? ""} />
                          </div>
                          <div className="field">
                            <label>Monto</label>
                            <input
                              min="0"
                              name="monto_mensual"
                              step="0.01"
                              type="number"
                              required
                              defaultValue={sistema.monto_mensual}
                            />
                          </div>
                          <div className="field">
                            <label>Vencimiento</label>
                            <input
                              name="fecha_vencimiento"
                              type="date"
                              required
                              defaultValue={sistema.fecha_vencimiento.slice(0, 10)}
                            />
                          </div>
                          <div className="field">
                            <label>Estado</label>
                            <select name="activo" defaultValue={String(sistema.activo)}>
                              <option value="true">Activo</option>
                              <option value="false">Suspendido</option>
                            </select>
                          </div>
                          <div className="field full">
                            <label>Notas</label>
                            <textarea name="notas" defaultValue={sistema.notas ?? ""} />
                          </div>
                          <div className="actions">
                            <button className="button secondary" type="submit">
                              Guardar datos
                            </button>
                          </div>
                        </form>

                        <form action={registerSistemaPagoAction} className="form-grid">
                          <input name="sistema_id" type="hidden" value={sistema.id} />
                          <input name="fecha_pago_default" type="hidden" value={today} />
                          <div className="field">
                            <label>Mes pagado</label>
                            <input name="mes_pagado" type="month" required defaultValue={currentMonth} />
                          </div>
                          <div className="field">
                            <label>Monto pagado</label>
                            <input
                              min="0"
                              name="monto"
                              step="0.01"
                              type="number"
                              required
                              defaultValue={sistema.monto_mensual}
                            />
                          </div>
                          <div className="field">
                            <label>Fecha pago</label>
                            <input name="fecha_pago" type="date" defaultValue={today} />
                          </div>
                          <div className="field">
                            <label>Nuevo vencimiento</label>
                            <input name="nuevo_vencimiento" type="date" />
                          </div>
                          <div className="field full">
                            <label>Observacion</label>
                            <input name="observacion" placeholder="Transferencia, efectivo, comprobante..." />
                          </div>
                          <div className="actions">
                            <button className="button" type="submit">
                              Registrar pago
                            </button>
                          </div>
                        </form>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {sistemas.length === 0 ? (
                <tr>
                  <td colSpan={7}>Todavia no hay sistemas cargados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <strong>Ultimos pagos registrados</strong>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Mes</th>
                <th>Monto</th>
                <th>Fecha pago</th>
                <th>Observacion</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.id}>
                  <td>{pago.nombre_cliente}</td>
                  <td>{formatDateOnly(pago.mes_pagado)}</td>
                  <td>{formatCurrency(pago.monto)}</td>
                  <td>{formatDateOnly(pago.fecha_pago)}</td>
                  <td>{pago.observacion || "-"}</td>
                </tr>
              ))}
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan={5}>Todavia no hay pagos registrados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
