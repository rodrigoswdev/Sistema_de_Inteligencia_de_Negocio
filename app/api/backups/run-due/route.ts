import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { runDueBackup } from "@/lib/repositories/backups";

export async function POST(request: Request) {
  const user = await getSession();
  const cronAuthorized =
    Boolean(process.env.BACKUP_CRON_SECRET) &&
    request.headers.get("x-backup-secret") === process.env.BACKUP_CRON_SECRET;
  if (!user?.roles.includes("ADMINISTRADOR") && !cronAuthorized) {
    return fail("Permiso denegado", 403);
  }
  try {
    return ok(await runDueBackup(user?.id), "Programación evaluada");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se evaluó la copia", 503);
  }
}
