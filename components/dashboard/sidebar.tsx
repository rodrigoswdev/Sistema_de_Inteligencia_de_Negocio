"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList, Database, FileChartColumn, Gauge, Landmark, Settings, Upload, UsersRound } from "lucide-react";
import type { SessionUser } from "@/lib/types";
import { canAccess } from "@/lib/auth/permissions";

const links = [
  ["/", "Resumen ejecutivo", Gauge],
  ["/ventas", "Ventas", ChartNoAxesCombined],
  ["/finanzas", "Finanzas", Landmark],
  ["/desempeno", "Desempeño", BriefcaseBusiness],
  ["/reportes", "Reportes", FileChartColumn],
  ["/alertas", "Alertas", Bell],
  ["/cargas", "Cargas de datos", Upload],
  ["/fuentes", "Fuentes de datos", Database],
  ["/administracion", "Administración", UsersRound],
  ["/auditoria", "Auditoría", ClipboardList],
] as const;

export function Sidebar({ user }: { user: SessionUser }) {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="nav-label">ANÁLISIS</div>
      {links.filter(([href]) => canAccess(user, href)).map(([href, label, Icon]) => (
        <Link key={href} href={href} className={`nav-link ${path === href ? "active" : ""}`}><Icon size={17} />{label}</Link>
      ))}
      <div className="nav-label">SISTEMA</div>
      <Link href="/perfil" className={`nav-link ${path === "/perfil" ? "active" : ""}`}><Settings size={17} />Mi perfil</Link>
    </aside>
  );
}
