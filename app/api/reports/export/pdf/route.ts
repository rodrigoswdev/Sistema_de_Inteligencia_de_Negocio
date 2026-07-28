import { filtersFromUrl } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { createProfessionalPdf } from "@/lib/services/exports";
import { reportRows, type ReportModule } from "@/lib/services/report-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moduleName = (url.searchParams.get("module") ?? "EJECUTIVO") as ReportModule;
  if (!["EJECUTIVO", "VENTAS", "FINANZAS", "DESEMPENO"].includes(moduleName)) {
    return Response.json({ message: "Módulo inválido" }, { status: 400 });
  }
  const filters = filtersFromUrl(request.url);
  const rows = await reportRows(moduleName, filters);
  const pdf = createProfessionalPdf({
    title: `Reporte ${moduleName}`,
    subtitle: "Sistema Integral de Business Intelligence",
    metadata: [
      `Filtros: ${Object.keys(filters).length ? JSON.stringify(filters) : "Todos los registros"}`,
      `Registros: ${rows.length}`,
    ],
    rows,
  });
  const user = await getSession();
  await writeAudit({
    authUserId: user?.id,
    action: "EXPORTAR_REPORTE",
    entity: "reporte",
    result: "EXITO",
    detail: { module: moduleName, format: "PDF", filters },
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${moduleName.toLowerCase()}-sibi-cbn.pdf"`,
    },
  });
}
