import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { scheduleReport } from "@/lib/repositories/reports";
import { scheduleReportSchema } from "@/lib/validators/reports";

export async function POST(request: Request) {
  const user = await getSession();
  if (
    !user?.roles.some((role) =>
      ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
    )
  ) {
    return fail("Permiso denegado", 403);
  }
  const parsed = scheduleReportSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) return fail("Programación inválida", 400);
  try {
    const schedule = await scheduleReport(parsed.data);
    await writeAudit({
      authUserId: user.id,
      action: "PROGRAMAR_REPORTE",
      entity: "reporte_programado",
      entityId: schedule.id,
      result: "EXITO",
    });
    return ok(schedule, "Reporte programado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se programó el reporte", 503);
  }
}
