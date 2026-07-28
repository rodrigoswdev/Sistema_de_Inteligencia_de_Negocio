import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { createUser, listUsers } from "@/lib/repositories/users";
import { createUserSchema } from "@/lib/validators/users";

async function administrator() {
  const user = await getSession();
  return user?.roles.includes("ADMINISTRADOR") ? user : null;
}

export async function GET() {
  if (!(await administrator())) return fail("Permiso denegado", 403);
  try {
    return ok(await listUsers());
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron consultar los usuarios",
      503,
    );
  }
}

export async function POST(request: Request) {
  const actor = await administrator();
  if (!actor) return fail("Permiso denegado", 403);
  const parsed = createUserSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Datos de usuario inválidos",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }
  try {
    const user = await createUser(parsed.data);
    await writeAudit({
      authUserId: actor.id,
      action: "CREAR_USUARIO",
      entity: "usuario",
      entityId: user.id,
      result: "EXITO",
    });
    return ok(user, "Usuario creado");
  } catch (error) {
    await writeAudit({
      authUserId: actor.id,
      action: "CREAR_USUARIO",
      entity: "usuario",
      result: "ERROR",
    });
    return fail(
      error instanceof Error ? error.message : "No se pudo crear el usuario",
      503,
    );
  }
}
