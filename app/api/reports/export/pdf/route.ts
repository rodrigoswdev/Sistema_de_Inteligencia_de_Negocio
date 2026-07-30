import { filtersFromUrl } from "@/lib/api/response";
import { canAccess } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { createProfessionalPdf } from "@/lib/services/exports";
import {
  REPORT_MODULE_LABELS,
  reportMetadata,
  reportRows,
  type ReportModule,
} from "@/lib/services/report-data";

export const runtime = "nodejs";

const modules: ReportModule[] = [
  "EJECUTIVO",
  "VENTAS",
  "FINANZAS",
  "DESEMPENO",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moduleName = (url.searchParams.get("module") ??
    "EJECUTIVO") as ReportModule;
  if (!modules.includes(moduleName)) {
    return Response.json({ message: "Módulo inválido" }, { status: 400 });
  }

  const user = await getSession();
  const accessPath =
    moduleName === "EJECUTIVO" ? "/" : `/${moduleName.toLowerCase()}`;
  if (!user || !canAccess(user, accessPath)) {
    return Response.json({ message: "Permiso denegado" }, { status: 403 });
  }

  const filters = filtersFromUrl(request.url);
  const rows = await reportRows(moduleName, filters);
  const pdf = createProfessionalPdf({
    title: `Reporte de ${REPORT_MODULE_LABELS[moduleName]}`,
    subtitle: "Sistema Integral de Business Intelligence · SIBI CBN",
    metadata: reportMetadata(filters, rows.length),
    rows,
  });
  await writeAudit({
    authUserId: user.id,
    action: "EXPORTAR_REPORTE",
    entity: "reporte",
    result: "EXITO",
    detail: { module: moduleName, format: "PDF", filters, rows: rows.length },
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${moduleName.toLowerCase()}-sibi-cbn.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
