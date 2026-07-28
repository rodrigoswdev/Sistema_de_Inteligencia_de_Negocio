import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { listAlerts, updateAlert } from "@/lib/repositories/alerts";
import { writeAudit } from "@/lib/repositories/audit";
import { updateAlertSchema } from "@/lib/validators/alerts";

export async function GET() {
  if (!(await getSession())) return fail("No autenticado", 401);
  try {
    return ok(await listAlerts());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se pudieron consultar las alertas", 503);
  }
}

export async function PATCH(request: Request) {
  const user = await getSession();
  if (
    !user?.roles.some((role) =>
      ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
    )
  ) {
    return fail("Permiso denegado", 403);
  }
  const body = await request.json().catch(() => ({}));
  const parsed = updateAlertSchema.safeParse(body);
  const id = typeof body.id === "string" ? body.id : String(body.id ?? "");
  if (!id || !parsed.success) return fail("Actualización de alerta inválida", 400);
  try {
    const alert = await updateAlert(id, user.id, parsed.data);
    await writeAudit({
      authUserId: user.id,
      action: "ATENDER_ALERTA",
      entity: "alerta",
      entityId: id,
      result: "EXITO",
    });
    return ok(alert, "Alerta actualizada");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se actualizó la alerta", 503);
  }
}
