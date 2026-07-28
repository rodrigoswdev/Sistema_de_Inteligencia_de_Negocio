import { filtersFromUrl, ok } from "@/lib/api/response";
import { getFinanceAnalytics } from "@/lib/services/analytics";

export async function GET(request: Request) {
  const filters = filtersFromUrl(request.url);
  return ok(await getFinanceAnalytics(filters), "Análisis financiero generado", filters);
}
