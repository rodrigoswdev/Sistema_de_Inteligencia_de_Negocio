import { fail, filtersFromUrl, ok } from "@/lib/api/response";
import { getPerformanceAnalytics } from "@/lib/services/analytics";

export async function GET(request: Request) {
  const filters = filtersFromUrl(request.url);
  if (!filters.unit) return fail("Seleccione una unidad para el detalle", 400);
  const data = await getPerformanceAnalytics(filters);
  return ok(
    {
      filters,
      kpis: data.kpis,
      matrix: data.matrix,
      records: data.universe,
      updatedAt: data.updatedAt,
    },
    "Drill-down de desempeño generado",
    filters,
  );
}
