"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Calculator,
  CreditCard,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Star,
  Stethoscope,
  Wallet,
  Wrench,
  X,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/inicio", label: "Inicio", Icon: LayoutDashboard },
  { href: "/registrar_venta", label: "Registrar venta", Icon: ShoppingCart },
  { href: "/agregar_stock", label: "Stock", Icon: Package },
  { href: "/ultimas_ventas", label: "Ultimas ventas", Icon: CreditCard },
  { href: "/caja", label: "Caja", Icon: Calculator },
  { href: "/egresos", label: "Egresos", Icon: Wallet },
  { href: "/reparaciones", label: "Reparaciones", Icon: Wrench },
  { href: "/mercaderia_fallada", label: "Mercaderia fallada", Icon: XCircle },
  { href: "/productos_mas_vendidos", label: "Top productos", Icon: Star },
  { href: "/productos_por_agotarse", label: "Por agotarse", Icon: AlertTriangle },
  { href: "/cotizar", label: "Cotizar", Icon: BadgeDollarSign },
  { href: "/facturar", label: "Facturar", Icon: FileSpreadsheet },
  { href: "/asignacion_manual", label: "Asignacion manual", Icon: Stethoscope }
];

export function Sidebar({ username, role }: { username: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleLinks =
    role === "admin"
      ? [{ href: "/dashboard", label: "Dashboard", Icon: BarChart3 }, ...links]
      : links;

  return (
    <>
      <button
        aria-label="Abrir menu"
        className="mobile-menu-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Menu size={20} />
      </button>

      {open ? <div className="sidebar-overlay" onClick={() => setOpen(false)} /> : null}

      <aside className={cn("sidebar", open && "sidebar-open")}>
        <div className="sidebar-mobile-head">
          <span>Menu</span>
          <button
            aria-label="Cerrar menu"
            className="mobile-close-button"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Servicell"
            className="brand-logo brand-logo-plain"
            src="https://res.cloudinary.com/dqsacd9ez/image/upload/v1775083849/logo_1_cd2ojk.png"
          />
        </div>

        <nav className="nav">
          {visibleLinks.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(pathname === href && "active")}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">
                <Icon size={16} strokeWidth={1.9} />
              </span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">Servicell Next</div>
      </aside>
    </>
  );
}
