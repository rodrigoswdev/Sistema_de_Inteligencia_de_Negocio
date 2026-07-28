import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { listRoles } from "@/lib/repositories/users";

export async function GET() {
  const user = await getSession();
  if (!user?.roles.includes("ADMINISTRADOR")) {
    return fail("Permiso denegado", 403);
  }
  try {
    return ok(await listRoles());
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron consultar los roles",
      503,
    );
  }
}
