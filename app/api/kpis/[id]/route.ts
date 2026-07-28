import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { updateKpi } from "@/lib/repositories/kpis";
import { updateKpiSchema } from "@/lib/validators/kpis";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user?.roles.includes("ADMINISTRADOR"))
    return fail("Permiso denegado", 403);
  const parsed = updateKpiSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) return fail("Cambios de KPI inválidos", 400);
  const { id } = await context.params;
  try {
    const kpi = await updateKpi(id, parsed.data);
    await writeAudit({
      authUserId: user.id,
      action: "ACTUALIZAR_KPI",
      entity: "kpi_definicion",
      entityId: id,
      result: "EXITO",
    });
    return ok(kpi, "KPI actualizado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se actualizó el KPI", 503);
  }
}
