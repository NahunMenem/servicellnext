import {
  createEquipoAction
} from "@/app/actions";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  PackageSearch,
  Save,
  ShieldAlert,
  UserCog,
  Wrench
} from "lucide-react";
import { Modal } from "@/components/modal";
import { RepairListSection } from "@/components/repair-list-section";
import { getEquipos } from "@/lib/data";
import { parsePage } from "@/lib/pagination";
import {
  REPAIR_BRANDS,
  REPAIR_TECHNICIANS,
  REPAIR_TYPES
} from "@/lib/repair-options";
import { toInputDate } from "@/lib/utils";

export default async function ReparacionesPage({
  searchParams
}: {
  searchParams: Promise<{ fecha_desde?: string; fecha_hasta?: string; page?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const fechaDesde = params.fecha_desde ?? toInputDate(weekAgo);
  const fechaHasta = params.fecha_hasta ?? toInputDate(today);
  const page = parsePage(params.page);
  const data = await getEquipos(fechaDesde, fechaHasta, page);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Registrar reparacion</h1>
          <p>Replica el flujo original con formulario, resumenes, tabla completa y comprobante.</p>
        </div>
        <Modal
          description="Carga una reparacion nueva sin salir del listado."
          title="Registrar reparacion"
          triggerLabel="Nueva reparacion"
          triggerContent={
            <span className="modal-trigger-inline">
              <Wrench size={16} strokeWidth={2} />
              Nueva reparacion
            </span>
          }
        >
          <form action={createEquipoAction} className="form-grid">
            <div className="field">
              <label>Tipo de reparacion</label>
              <select name="tipo_reparacion" defaultValue={REPAIR_TYPES[0]}>
                {REPAIR_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Observaciones</label>
              <textarea name="observaciones" rows={3} />
            </div>
            <div className="field">
              <label>Equipo</label>
              <select name="equipo" defaultValue={REPAIR_BRANDS[0]}>
                {REPAIR_BRANDS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Modelo</label>
              <input name="modelo" required />
            </div>
            <div className="field">
              <label>Tecnico</label>
              <select name="tecnico" defaultValue={REPAIR_TECHNICIANS[0]}>
                {REPAIR_TECHNICIANS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Monto</label>
              <input name="monto" type="number" step="0.01" required />
            </div>
            <div className="field">
              <label>Nombre del cliente</label>
              <input name="nombre_cliente" required />
            </div>
            <div className="field">
              <label>Numero de telefono</label>
              <input name="telefono" required />
            </div>
            <div className="actions">
              <button className="button" type="submit">
                <Save size={16} strokeWidth={2} />
                Registrar reparacion
              </button>
            </div>
          </form>
        </Modal>
      </div>

      <section className="card stack">
        <div className="dashboard-section-title">
          <CalendarDays size={18} strokeWidth={1.9} />
          <strong>Filtrar por fecha</strong>
        </div>
        <form className="dashboard-filter-grid">
          <label className="field">
            <span>Desde</span>
            <input type="date" name="fecha_desde" defaultValue={fechaDesde} />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input type="date" name="fecha_hasta" defaultValue={fechaHasta} />
          </label>
          <div className="actions" style={{ alignItems: "end" }}>
            <button className="button secondary" type="submit">
              <CalendarDays size={16} strokeWidth={2} />
              Filtrar
            </button>
          </div>
        </form>
      </section>

      <section className="card stack">
        <div className="dashboard-section-title">
          <UserCog size={18} strokeWidth={1.9} />
          <strong>Equipos por tecnico</strong>
        </div>
        <div className="repair-chip-grid">
          {Object.entries(data.equiposPorTecnico).map(([tecnico, cantidad]) => (
            <article className="repair-summary-chip" key={tecnico}>
              <strong>{tecnico}</strong>
              <span className="muted">Equipos asignados: {cantidad}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="card stack">
        <div className="dashboard-section-title">
          <ClipboardList size={18} strokeWidth={1.9} />
          <strong>Resumen por estado</strong>
        </div>
        <div className="repair-chip-grid">
          <article className="repair-summary-chip">
            <ShieldAlert size={18} strokeWidth={1.9} />
            <strong>Por reparar</strong>
            <span className="muted">Cantidad: {data.estados.por_reparar}</span>
          </article>
          <article className="repair-summary-chip">
            <Wrench size={18} strokeWidth={1.9} />
            <strong>En reparacion</strong>
            <span className="muted">Cantidad: {data.estados.en_reparacion}</span>
          </article>
          <article className="repair-summary-chip">
            <CheckCircle2 size={18} strokeWidth={1.9} />
            <strong>Listo</strong>
            <span className="muted">Cantidad: {data.estados.listo}</span>
          </article>
          <article className="repair-summary-chip">
            <PackageSearch size={18} strokeWidth={1.9} />
            <strong>Retirado</strong>
            <span className="muted">Cantidad: {data.estados.retirado}</span>
          </article>
          <article className="repair-summary-chip">
            <ClipboardList size={18} strokeWidth={1.9} />
            <strong>Total equipos</strong>
            <span className="muted">Cantidad: {data.estados.total}</span>
          </article>
        </div>
        <div className="dashboard-section-title">
          <Wrench size={18} strokeWidth={1.9} />
          <strong>Resumen por tipo de reparacion</strong>
        </div>
        <div className="repair-chip-grid compact">
          {data.resumenTipo.map((item) => (
            <article className="repair-type-card" key={item.tipo_reparacion}>
              <span className="muted">{item.tipo_reparacion}</span>
              <strong>{item.cantidad}</strong>
            </article>
          ))}
        </div>
      </section>

      <RepairListSection
        equipos={data.equipos}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        hasNext={data.hasNextEquipos}
        page={page}
      />
    </div>
  );
}
