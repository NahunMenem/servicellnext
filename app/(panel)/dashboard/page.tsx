import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wrench
} from "lucide-react";
import { Fragment } from "react";
import { redirect } from "next/navigation";
import { LineChart } from "@/components/line-chart";
import { getHolidayWeekHighlights } from "@/lib/argentina-holidays";
import { requireSession } from "@/lib/auth";
import { getDashboard } from "@/lib/data";
import { endOfWeekInput, formatCurrency, startOfWeekInput, toInputDate } from "@/lib/utils";

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getPercent(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ fecha_desde?: string; fecha_hasta?: string }>;
}) {
  const session = await requireSession();
  if (session.role !== "admin") {
    redirect("/inicio");
  }

  const params = await searchParams;
  const today = toInputDate(new Date());
  const fechaDesde = params.fecha_desde ?? startOfWeekInput(today);
  const fechaHasta = params.fecha_hasta ?? endOfWeekInput(today);
  const dashboard = await getDashboard(fechaDesde, fechaHasta);
  const ventasBase = dashboard.totalVentas || 1;
  const porcentajeEgresos = getPercent(dashboard.totalEgresos, ventasBase);
  const porcentajeCosto = getPercent(dashboard.totalCosto, ventasBase);
  const porcentajeGanancia = getPercent(dashboard.ganancia, ventasBase);
  const porcentajeProductos = getPercent(dashboard.totalVentasProductos, ventasBase);
  const porcentajeReparaciones = getPercent(dashboard.totalVentasReparaciones, ventasBase);
  const holidayWeeks = Object.fromEntries(getHolidayWeekHighlights(dashboard.ventasSemanales.map((item) => item.semana)));
  const currentMonthLabel = today.slice(0, 7);
  const monthlyChartPoints = dashboard.ventasMensuales.filter((item) => item.mes !== "2025-03");
  const telefonosAgrupados = dashboard.telefonosPeriodo.items.reduce<
    Array<{
      estado: string;
      items: typeof dashboard.telefonosPeriodo.items;
    }>
  >((groups, item) => {
    const current = groups.find((group) => group.estado === item.estado);
    if (current) {
      current.items.push(item);
      return groups;
    }
    groups.push({ estado: item.estado, items: [item] });
    return groups;
  }, []);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Indicadores claros de ventas, costos, stock y rendimiento del periodo seleccionado.</p>
        </div>
      </div>

      <section className="card stack">
        <div className="dashboard-filter-head">
          <div className="dashboard-filter-title">
            <CalendarDays size={18} strokeWidth={1.9} />
            <strong>Filtrar periodo</strong>
          </div>
          <span className="muted">Los campos abren el calendario nativo para elegir fechas.</span>
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
              Aplicar filtro
            </button>
          </div>
        </form>
      </section>

      <div className="kpis">
        <section className="card dark dashboard-kpi">
          <div className="dashboard-kpi-icon">
            <CircleDollarSign size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Ventas totales</small>
            <strong>{formatCurrency(dashboard.totalVentas)}</strong>
            <span className="kpi-meta">Base 100% del periodo filtrado</span>
          </div>
        </section>
        <section className="card dashboard-kpi">
          <div className="dashboard-kpi-icon danger">
            <TrendingDown size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Egresos</small>
            <strong>{formatCurrency(dashboard.totalEgresos)}</strong>
            <span className="kpi-meta">{formatPercent(porcentajeEgresos)} de las ventas</span>
          </div>
        </section>
        <section className="card dashboard-kpi">
          <div className="dashboard-kpi-icon amber">
            <Package size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Costo</small>
            <strong>{formatCurrency(dashboard.totalCosto)}</strong>
            <span className="kpi-meta">{formatPercent(porcentajeCosto)} de las ventas</span>
          </div>
        </section>
        <section className="card dashboard-kpi">
          <div className="dashboard-kpi-icon success">
            <TrendingUp size={20} strokeWidth={2} />
          </div>
          <div className="stat">
            <small>Ganancia</small>
            <strong>{formatCurrency(dashboard.ganancia)}</strong>
            <span className="kpi-meta">{formatPercent(porcentajeGanancia)} de las ventas</span>
          </div>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <div className="dashboard-section-title">
            <BarChart3 size={18} strokeWidth={1.9} />
            <strong>Composicion del negocio</strong>
          </div>
          <div className="dashboard-composition-block">
            <div className="dashboard-composition-head">
              <strong>Ingresos del periodo</strong>
              <span className="muted">Cuanto aportan productos y reparaciones dentro del total vendido.</span>
            </div>
            <div className="dashboard-breakdown-grid">
              <div className="dashboard-breakdown-item dashboard-breakdown-item-emphasis">
                <div className="dashboard-breakdown-label">
                  <ShoppingBag size={16} />
                  Productos
                </div>
                <strong>{formatCurrency(dashboard.totalVentasProductos)}</strong>
                <span className="muted">{formatPercent(porcentajeProductos)} del total vendido</span>
              </div>
              <div className="dashboard-breakdown-item dashboard-breakdown-item-emphasis">
                <div className="dashboard-breakdown-label">
                  <Wrench size={16} />
                  Reparaciones
                </div>
                <strong>{formatCurrency(dashboard.totalVentasReparaciones)}</strong>
                <span className="muted">{formatPercent(porcentajeReparaciones)} del total vendido</span>
              </div>
            </div>
          </div>
          <div className="dashboard-composition-block">
            <div className="dashboard-composition-head">
              <strong>Foto actual del stock</strong>
              <span className="muted">Valor invertido, valor potencial y unidades disponibles.</span>
            </div>
            <div className="dashboard-breakdown-grid">
              <div className="dashboard-breakdown-item">
                <div className="dashboard-breakdown-label">
                  <Package size={16} />
                  Costo de stock
                </div>
                <strong>{formatCurrency(dashboard.totalCostoStock)}</strong>
                <span className="muted">Valor invertido en stock actual</span>
              </div>
              <div className="dashboard-breakdown-item">
                <div className="dashboard-breakdown-label">
                  <CircleDollarSign size={16} />
                  Valor de stock
                </div>
                <strong>{formatCurrency(dashboard.totalVentaStock)}</strong>
                <span className="muted">Valor potencial de venta</span>
              </div>
              <div className="dashboard-breakdown-item full">
                <div className="dashboard-breakdown-label">
                  <Package size={16} />
                  Cantidad total en stock
                </div>
                <strong>{dashboard.cantidadTotalStock}</strong>
                <span className="muted">Unidades disponibles en inventario</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card stack">
          <div className="dashboard-section-title">
            <BarChart3 size={18} strokeWidth={1.9} />
            <strong>Distribucion del periodo</strong>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Total</th>
                  <th>Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.distribucionVentas.map((item) => (
                <tr key={item.tipo}>
                  <td>{item.tipo}</td>
                  <td>{formatCurrency(item.total)}</td>
                  <td>{formatPercent(getPercent(item.total, ventasBase))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="dashboard-breakdown-grid">
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <Wrench size={16} />
                Telefonos en el periodo
              </div>
              <strong>{dashboard.telefonosPeriodo.total}</strong>
              <span className="muted">Monto total: {formatCurrency(dashboard.telefonosPeriodo.montoTotal)}</span>
            </div>
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <Wrench size={16} />
                Por reparar
              </div>
              <strong>{dashboard.telefonosPeriodo.estados.por_reparar.cantidad}</strong>
              <span className="muted">Monto: {formatCurrency(dashboard.telefonosPeriodo.estados.por_reparar.monto)}</span>
            </div>
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <Wrench size={16} />
                En reparacion
              </div>
              <strong>{dashboard.telefonosPeriodo.estados.en_reparacion.cantidad}</strong>
              <span className="muted">Monto: {formatCurrency(dashboard.telefonosPeriodo.estados.en_reparacion.monto)}</span>
            </div>
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <Wrench size={16} />
                Listo
              </div>
              <strong>{dashboard.telefonosPeriodo.estados.listo.cantidad}</strong>
              <span className="muted">Monto: {formatCurrency(dashboard.telefonosPeriodo.estados.listo.monto)}</span>
            </div>
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <Wrench size={16} />
                Retirado
              </div>
              <strong>{dashboard.telefonosPeriodo.estados.retirado.cantidad}</strong>
              <span className="muted">Monto: {formatCurrency(dashboard.telefonosPeriodo.estados.retirado.monto)}</span>
            </div>
            <div className="dashboard-breakdown-item">
              <div className="dashboard-breakdown-label">
                <Wrench size={16} />
                No salio
              </div>
              <strong>{dashboard.telefonosPeriodo.estados.no_salio.cantidad}</strong>
              <span className="muted">Monto: {formatCurrency(dashboard.telefonosPeriodo.estados.no_salio.monto)}</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Tipo Reparacion</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {telefonosAgrupados.length ? (
                  telefonosAgrupados.map((group) => (
                    <Fragment key={group.estado}>
                      <tr className="dashboard-group-row">
                        <td colSpan={6}>
                          <strong>{group.estado}</strong>
                          <span className="muted" style={{ marginLeft: 10 }}>
                            {group.items.length} equipos
                          </span>
                        </td>
                      </tr>
                      {group.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.estado}</td>
                          <td>{item.tipo_reparacion}</td>
                          <td>{item.marca}</td>
                          <td>{item.modelo}</td>
                          <td>{formatCurrency(item.monto)}</td>
                          <td>{item.fecha}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className="cart-empty">No hay telefonos cargados en el rango seleccionado.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid cols-2">
        <section className="card stack">
          <div className="dashboard-section-title">
            <BarChart3 size={18} strokeWidth={1.9} />
            <strong>Ventas Totales Mensuales</strong>
          </div>
          <LineChart
            points={monthlyChartPoints.map((item) => ({
              label: item.mes,
              value: item.total
            }))}
            minGuideExcludeLabels={[currentMonthLabel]}
            title="Ventas Totales Mensuales"
            subtitle="Toca el grafico para abrir una vista ampliada de la evolucion mensual."
          />
        </section>

        <section className="card stack">
          <div className="dashboard-section-title">
            <BarChart3 size={18} strokeWidth={1.9} />
            <strong>Ventas Totales Semanales</strong>
          </div>
          <LineChart
            points={dashboard.ventasSemanales.map((item) => ({
              label: item.semana,
              value: item.total
            }))}
            highlightedLabels={holidayWeeks}
            tone="warm"
            title="Ventas Totales Semanales"
            subtitle="Las semanas con feriados de Argentina quedan marcadas en rojo para leer mejor el contexto."
          />
        </section>
      </div>
    </div>
  );
}
