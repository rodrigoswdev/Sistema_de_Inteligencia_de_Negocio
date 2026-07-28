import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { updateSource } from "@/lib/repositories/sources";
import { updateSourceSchema } from "@/lib/validators/sources";

export async function PATCH(
  request: Request,
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
  const parsed = updateSourceSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Cambios de fuente inválidos",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }
  const { id } = await context.params;
  try {
    const source = await updateSource(id, parsed.data);
    await writeAudit({
      authUserId: actor.id,
      action: "ACTUALIZAR_FUENTE",
      entity: "fuente_dato",
      entityId: id,
      result: "EXITO",
    });
    return ok(source, "Fuente actualizada");
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo actualizar la fuente",
      503,
    );
  }
}
