import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { retryLoad } from "@/lib/repositories/imports";
import { recalculateAfterLoad } from "@/lib/services/recalculation";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getSession();
  if (
    !actor?.roles.some((role) =>
      ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
    )
  ) {
    return fail("Permiso denegado", 403);
  }
  const { id } = await context.params;
  try {
    const load = await retryLoad(id);
    if (load.status === "COMPLETADA") await recalculateAfterLoad();
    await writeAudit({
      authUserId: actor.id,
      action: "REINTENTAR_CARGA",
      entity: "carga_dato",
      entityId: id,
      result: load.status === "COMPLETADA" ? "EXITO" : "ERROR",
    });
    return ok(load, "Reintento finalizado");
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo reintentar la carga",
      409,
    );
  }
}
