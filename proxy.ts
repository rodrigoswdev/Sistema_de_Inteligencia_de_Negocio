import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { SessionUser } from "@/lib/types";
import { ROUTE_ACCESS } from "@/lib/auth/permissions";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/login") || path.startsWith("/api/auth")) return NextResponse.next();
  const token = request.cookies.get("sibi_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "cbn-demo-secret-change-in-production-2026");
    const { payload } = await jwtVerify(token, secret);
    const user = payload.user as SessionUser;
    const apiRoute =
      path.startsWith("/api/analytics/sales") ? "/ventas" :
      path.startsWith("/api/analytics/finance") ? "/finanzas" :
      path.startsWith("/api/analytics/performance") ? "/desempeno" :
      path.startsWith("/api/imports") ? "/cargas" :
      path.startsWith("/api/backups") ? "/administracion" :
      path.startsWith("/api/admin/sources") ? "/fuentes" :
      path.startsWith("/api/admin") || path.startsWith("/api/kpis") ? "/administracion" :
      path.startsWith("/api/audit") ? "/auditoria" :
      path.startsWith("/api/reports") ? "/reportes" :
      path.startsWith("/api/alerts") ? "/alertas" :
      null;
    const route = apiRoute ?? Object.keys(ROUTE_ACCESS).filter(key => key !== "/" && path.startsWith(key))[0] ?? "/";
    if (!user.roles.some(role => ROUTE_ACCESS[route].includes(role))) {
      return NextResponse.json({ message: "Permiso denegado" }, { status: 403 });
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
