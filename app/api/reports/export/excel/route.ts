import { filtersFromUrl } from "@/lib/api/response";
import { canAccess } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { createSpreadsheet } from "@/lib/services/exports";
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
    "VENTAS") as ReportModule;
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
  const workbook = createSpreadsheet(rows, {
    title: `SIBI CBN · Reporte de ${REPORT_MODULE_LABELS[moduleName]}`,
    subtitle: "Sistema Integral de Business Intelligence",
    metadata: reportMetadata(filters, rows.length),
  });
  await writeAudit({
    authUserId: user.id,
    action: "EXPORTAR_REPORTE",
    entity: "reporte",
    result: "EXITO",
    detail: { module: moduleName, format: "EXCEL", filters, rows: rows.length },
  });

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${moduleName.toLowerCase()}-sibi-cbn.xlsx"`,
      "Content-Length": String(workbook.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
