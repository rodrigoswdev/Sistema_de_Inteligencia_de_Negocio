import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getLoad } from "@/lib/repositories/imports";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getSession();
  if (
    !actor?.roles.some((role) =>
      ["ADMINISTRADOR", "ANALISTA_BI", "AUDITOR"].includes(role),
    )
  ) {
    return fail("Permiso denegado", 403);
  }
  const { id } = await context.params;
  const load = await getLoad(id);
  if (!load) return fail("Carga no encontrada", 404);
  return ok(load, "Resultado de validación consultado");
}
