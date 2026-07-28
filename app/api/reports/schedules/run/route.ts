import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { runDueSchedules } from "@/lib/repositories/reports";

export async function POST() {
  const user = await getSession();
  if (
    !user?.roles.some((role) =>
      ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
    )
  ) {
    return fail("Permiso denegado", 403);
  }
  try {
    const deliveries = await runDueSchedules();
    await writeAudit({
      authUserId: user.id,
      action: "EJECUTAR_REPORTES_PROGRAMADOS",
      entity: "reporte_programado",
      result: "EXITO",
      detail: { deliveries: deliveries.length },
    });
    return ok(
      deliveries,
      `${deliveries.length} entregas preparadas para el servicio de correo`,
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se ejecutó la programación", 503);
  }
}
