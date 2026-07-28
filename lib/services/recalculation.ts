import "server-only";

import { revalidatePath } from "next/cache";
import { generateAlerts } from "@/lib/repositories/alerts";

const dashboardPaths = ["/", "/ventas", "/finanzas", "/desempeno", "/alertas"];

export async function recalculateAfterLoad() {
  // Los KPI se calculan sobre las tablas de hechos en cada consulta. Al
  // invalidar estas rutas se garantiza que la siguiente vista use la carga.
  dashboardPaths.forEach((path) => revalidatePath(path));
  const alerts = await generateAlerts();
  return { dashboardsInvalidated: dashboardPaths.length, alerts };
}
