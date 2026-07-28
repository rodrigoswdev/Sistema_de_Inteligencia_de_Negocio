import { destroySession, getSession } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";
import { isDemoMode } from "@/lib/config";
import { writeAudit } from "@/lib/repositories/audit";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export async function POST() {
  const user = await getSession();
  if (!isDemoMode() && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  await writeAudit({
    authUserId: user?.id,
    action: "CIERRE_SESION",
    entity: "usuario",
    entityId: user?.id,
    result: "EXITO",
  });
  await destroySession();
  return ok(null, "Sesión cerrada");
}
