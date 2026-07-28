import { filtersFromUrl, ok } from "@/lib/api/response";
import { getExecutiveDashboard } from "@/lib/services/analytics";

export async function GET(request: Request) {
  const filters = filtersFromUrl(request.url);
  return ok(await getExecutiveDashboard(filters), "Dashboard generado", filters);
}
