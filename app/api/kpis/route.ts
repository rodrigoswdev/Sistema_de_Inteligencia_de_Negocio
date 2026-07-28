import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/repositories/audit";
import { createKpi, listKpis } from "@/lib/repositories/kpis";
import { createKpiSchema } from "@/lib/validators/kpis";

export async function GET() {
  const user = await getSession();
  if (!user) return fail("No autenticado", 401);
  try {
    return ok(await listKpis());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se pudieron consultar los KPI", 503);
  }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user?.roles.includes("ADMINISTRADOR"))
    return fail("Permiso denegado", 403);
  const parsed = createKpiSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Definición de KPI inválida",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }
  try {
    const kpi = await createKpi(user.id, parsed.data);
    await writeAudit({
      authUserId: user.id,
      action: "CREAR_KPI",
      entity: "kpi_definicion",
      entityId: kpi.id,
      result: "EXITO",
    });
    return ok(kpi, "KPI creado");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se pudo crear el KPI", 503);
  }
}
