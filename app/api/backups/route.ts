import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import {
  createBackup,
  getBackupConfig,
  listBackups,
  nextBackupAt,
  updateBackupConfig,
} from "@/lib/repositories/backups";
import { writeAudit } from "@/lib/repositories/audit";
import { backupConfigSchema } from "@/lib/validators/backups";

async function admin() {
  const user = await getSession();
  return user?.roles.includes("ADMINISTRADOR") ? user : null;
}

export async function GET() {
  if (!(await admin())) return fail("Permiso denegado", 403);
  try {
    const [config, history] = await Promise.all([
      getBackupConfig(),
      listBackups(),
    ]);
    return ok({
      config,
      history,
      nextRun: nextBackupAt(config).toISOString(),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se consultaron las copias", 503);
  }
}

export async function PATCH(request: Request) {
  const user = await admin();
  if (!user) return fail("Permiso denegado", 403);
  const parsed = backupConfigSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Configuración de copia inválida",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }
  try {
    const config = await updateBackupConfig(user.id, parsed.data);
    await writeAudit({
      authUserId: user.id,
      action: "CONFIGURAR_COPIAS",
      entity: "configuracion_copia",
      entityId: "1",
      result: "EXITO",
      detail: parsed.data,
    });
    return ok(config, "Programación guardada");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se guardó la configuración", 503);
  }
}

export async function POST() {
  const user = await admin();
  if (!user) return fail("Permiso denegado", 403);
  try {
    const backup = await createBackup(user.id);
    await writeAudit({
      authUserId: user.id,
      action: "CREAR_COPIA_SEGURIDAD",
      entity: "copia_seguridad",
      entityId: backup.id,
      result: backup.status === "COMPLETADA" ? "EXITO" : "ERROR",
      detail: { sizeBytes: backup.sizeBytes, tables: backup.tables },
    });
    return ok(
      backup,
      backup.status === "COMPLETADA"
        ? "Copia creada correctamente"
        : backup.error ?? "La copia falló",
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "No se creó la copia", 503);
  }
}
