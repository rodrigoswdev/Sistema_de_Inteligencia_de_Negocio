import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { listAudit } from "@/lib/repositories/audit";

export async function GET() {
  const user = await getSession();
  if (
    !user?.roles.some((role) =>
      ["ADMINISTRADOR", "AUDITOR"].includes(role),
    )
  ) {
    return fail("Permiso denegado", 403);
  }
  try {
    return ok(await listAudit());
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo consultar la bitácora",
      503,
    );
  }
}
