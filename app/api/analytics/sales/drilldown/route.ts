import { fail, filtersFromUrl, ok } from "@/lib/api/response";
import { getSalesAnalytics } from "@/lib/services/analytics";

export async function GET(request: Request) {
  const filters = filtersFromUrl(request.url);
  if (!filters.product && !filters.region && !filters.channel) {
    return fail("Seleccione producto, región o canal para el detalle", 400);
  }
  const data = await getSalesAnalytics(filters);
  return ok(
    {
      filters,
      kpis: data.kpis,
      detail: data.detail,
      records: data.universe,
      updatedAt: data.updatedAt,
    },
    "Drill-down comercial generado",
    filters,
  );
}
