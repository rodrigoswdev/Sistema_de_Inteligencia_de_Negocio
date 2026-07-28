import { ok } from "@/lib/api/response";
import { getMetadata } from "@/lib/services/analytics";

export async function GET() {
  return ok(await getMetadata());
}
