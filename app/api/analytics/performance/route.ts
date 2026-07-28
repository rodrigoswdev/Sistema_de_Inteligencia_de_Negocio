import { filtersFromUrl, ok } from "@/lib/api/response";
import { getPerformanceAnalytics } from "@/lib/services/analytics";

export async function GET(request: Request) {
  const filters = filtersFromUrl(request.url);
  return ok(await getPerformanceAnalytics(filters), "Análisis de desempeño generado", filters);
}
