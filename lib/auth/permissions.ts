import type { AppRole, SessionUser } from "@/lib/types";

export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  "/": ["ADMINISTRADOR", "ANALISTA_BI", "GERENCIA", "AUDITOR"],
  "/ventas": ["ADMINISTRADOR", "ANALISTA_BI", "VENTAS", "GERENCIA", "AUDITOR"],
  "/finanzas": ["ADMINISTRADOR", "ANALISTA_BI", "FINANZAS", "GERENCIA", "AUDITOR"],
  "/desempeno": ["ADMINISTRADOR", "ANALISTA_BI", "DESEMPENO", "GERENCIA", "AUDITOR"],
  "/reportes": ["ADMINISTRADOR", "ANALISTA_BI", "GERENCIA", "AUDITOR"],
  "/alertas": ["ADMINISTRADOR", "ANALISTA_BI", "GERENCIA", "AUDITOR"],
  "/cargas": ["ADMINISTRADOR", "ANALISTA_BI"],
  "/fuentes": ["ADMINISTRADOR", "ANALISTA_BI"],
  "/administracion": ["ADMINISTRADOR"],
  "/auditoria": ["ADMINISTRADOR", "AUDITOR"],
  "/perfil": ["ADMINISTRADOR", "ANALISTA_BI", "VENTAS", "FINANZAS", "DESEMPENO", "GERENCIA", "AUDITOR"],
};

export function canAccess(user: SessionUser, path: string) {
  const roles = ROUTE_ACCESS[path] ?? ROUTE_ACCESS["/"];
  return user.roles.some((role) => roles.includes(role));
}

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMINISTRADOR: "Configuración, seguridad y acceso total",
  ANALISTA_BI: "Cargas, fuentes, análisis, alertas y reportes",
  VENTAS: "Consulta comercial",
  FINANZAS: "Consulta financiera",
  DESEMPENO: "Consulta de desempeño",
  GERENCIA: "Resumen ejecutivo, módulos, reportes y alertas",
  AUDITOR: "Consulta ejecutiva, módulos, reportes, alertas y bitácora",
};

export function isAdmin(user: SessionUser) {
  return user.roles.includes("ADMINISTRADOR");
}

export function landingPath(user: SessionUser) {
  if (user.roles.includes("VENTAS")) return "/ventas";
  if (user.roles.includes("FINANZAS")) return "/finanzas";
  if (user.roles.includes("DESEMPENO")) return "/desempeno";
  return "/";
}
