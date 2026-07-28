import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { updateUser } from "@/lib/repositories/users";
import { updateUserSchema } from "@/lib/validators/users";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getSession();
  if (!actor?.roles.includes("ADMINISTRADOR")) {
    return fail("Permiso denegado", 403);
  }
  const parsed = updateUserSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Cambios de usuario inválidos",
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
    const user = await updateUser(id, parsed.data);
    await writeAudit({
      authUserId: actor.id,
      action: "ACTUALIZAR_USUARIO",
      entity: "usuario",
      entityId: id,
      result: "EXITO",
      detail: {
        state: parsed.data.state,
        rolesChanged: Boolean(parsed.data.roles),
      },
    });
    return ok(user, "Usuario actualizado");
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo actualizar el usuario",
      503,
    );
  }
}
