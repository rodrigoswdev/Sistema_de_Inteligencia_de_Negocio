import { filtersFromUrl, ok } from "@/lib/api/response";
import { getSalesAnalytics } from "@/lib/services/analytics";

export async function GET(request: Request) {
  const filters = filtersFromUrl(request.url);
  return ok(await getSalesAnalytics(filters), "Análisis de ventas generado", filters);
}
