import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { createSource, listSources } from "@/lib/repositories/sources";
import { createSourceSchema } from "@/lib/validators/sources";

async function canManage() {
  const user = await getSession();
  return user?.roles.some((role) =>
    ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
  )
    ? user
    : null;
}

export async function GET() {
  if (!(await canManage())) return fail("Permiso denegado", 403);
  try {
    return ok(await listSources());
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron consultar las fuentes",
      503,
    );
  }
}

export async function POST(request: Request) {
  const actor = await canManage();
  if (!actor) return fail("Permiso denegado", 403);
  const parsed = createSourceSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Datos de fuente inválidos",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }
  try {
    const source = await createSource(parsed.data);
    await writeAudit({
      authUserId: actor.id,
      action: "CREAR_FUENTE",
      entity: "fuente_dato",
      entityId: source.id,
      result: "EXITO",
    });
    return ok(source, "Fuente creada");
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo crear la fuente",
      503,
    );
  }
}
