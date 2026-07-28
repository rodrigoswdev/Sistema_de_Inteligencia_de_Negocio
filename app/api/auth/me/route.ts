import { getSession } from "@/lib/auth/session";
import { fail, ok } from "@/lib/api/response";

export async function GET() {
  const user = await getSession();
  return user ? ok(user) : fail("No autenticado", 401);
}
