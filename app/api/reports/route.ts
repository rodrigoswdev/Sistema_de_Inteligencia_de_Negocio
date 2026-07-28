import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { createReport, listReports } from "@/lib/repositories/reports";
import { createReportSchema } from "@/lib/validators/reports";

export async function GET() {
  if (!(await getSession())) return fail("No autenticado", 401);
  try {
    return ok(await listReports());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se consultaron los reportes", 503);
  }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return fail("No autenticado", 401);
  const parsed = createReportSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Configuración de reporte inválida",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }
  try {
    const report = await createReport(user.id, parsed.data);
    await writeAudit({
      authUserId: user.id,
      action: "CREAR_REPORTE",
      entity: "reporte",
      entityId: report.id,
      result: "EXITO",
      detail: { module: report.module, format: report.format },
    });
    return ok(report, "Reporte guardado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se creó el reporte", 503);
  }
}
