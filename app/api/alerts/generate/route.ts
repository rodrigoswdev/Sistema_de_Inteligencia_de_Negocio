import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { generateAlerts } from "@/lib/repositories/alerts";
import { writeAudit } from "@/lib/repositories/audit";

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
    const result = await generateAlerts();
    await writeAudit({
      authUserId: user.id,
      action: "GENERAR_ALERTAS",
      entity: "alerta",
      result: "EXITO",
      detail: result,
    });
    return ok(result, `${result.created} alertas nuevas`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se generaron alertas", 503);
  }
}
