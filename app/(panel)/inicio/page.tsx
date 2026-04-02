import Link from "next/link";
import { getQuickStats } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function InicioPage() {
  const stats = await getQuickStats();
  const quickLinks = [
    ["/caja", "∑", "Caja"],
    ["/registrar_venta", "🛒", "Ventas"],
    ["/agregar_stock", "▣", "Stock"],
    ["/reparaciones", "⌁", "Reparaciones"],
    ["/cotizar", "$", "Cotizar"],
    ["/dashboard", "◫", "Dashboard"]
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Panel principal</h1>
          <p>Accede rapido a las funciones del sistema con la nueva identidad visual.</p>
        </div>
      </div>

      <div className="kpis">
        <section className="card dark stat">
          <small>Stock total</small>
          <strong>{stats.stock}</strong>
        </section>
        <section className="card stat">
          <small>Ordenes de taller</small>
          <strong>{stats.ordenes}</strong>
        </section>
        <section className="card stat">
          <small>Unidades vendidas</small>
          <strong>{stats.unidadesVendidas}</strong>
        </section>
        <section className="card stat">
          <small>Egresos acumulados</small>
          <strong>{formatCurrency(stats.egresos)}</strong>
        </section>
      </div>

      <div className="grid cols-3">
        {quickLinks.map(([href, icon, title]) => (
          <Link key={href} href={href} className="quick-link">
            <span className="quick-icon">{icon}</span>
            <span style={{ fontWeight: 700 }}>{title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
