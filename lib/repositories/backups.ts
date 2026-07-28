import "server-only";

import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export interface BackupConfigView {
  frequency: "DIARIA" | "SEMANAL" | "MENSUAL";
  time: string;
  weekDay?: number | null;
  monthDay?: number | null;
  retention: number;
  includeAudit: boolean;
  active: boolean;
  updatedAt: string;
}

export interface BackupView {
  id: string;
  type: string;
  status: string;
  file?: string | null;
  sizeBytes?: number | null;
  checksum?: string | null;
  tables: number;
  startedAt: string;
  finishedAt?: string | null;
  error?: string | null;
}

const defaultConfig: BackupConfigView = {
  frequency: "SEMANAL",
  time: "02:00",
  weekDay: 0,
  monthDay: 1,
  retention: 12,
  includeAudit: true,
  active: true,
  updatedAt: new Date().toISOString(),
};

const demoState = {
  config: defaultConfig,
  history: [] as BackupView[],
  files: new Map<string, Buffer>(),
};

const backupTables = [
  "rol",
  "usuario",
  "usuario_rol",
  "fuente_dato",
  "carga_dato",
  "error_carga",
  "dim_fecha",
  "dim_producto",
  "dim_sucursal",
  "dim_canal",
  "dim_empleado",
  "dim_cuenta",
  "dim_centro_costo",
  "dim_escenario",
  "dim_unidad",
  "dim_kpi",
  "fact_venta",
  "fact_finanza",
  "fact_desempeno",
  "kpi_definicion",
  "kpi_umbral",
  "alerta",
  "reporte",
  "reporte_programado",
] as const;

function serializeConfig(row: {
  frecuencia: string;
  hora: string;
  diaSemana: number | null;
  diaMes: number | null;
  retencion: number;
  incluirAuditoria: boolean;
  activo: boolean;
  actualizadoEn: Date;
}): BackupConfigView {
  return {
    frequency: row.frecuencia as BackupConfigView["frequency"],
    time: row.hora,
    weekDay: row.diaSemana,
    monthDay: row.diaMes,
    retention: row.retencion,
    includeAudit: row.incluirAuditoria,
    active: row.activo,
    updatedAt: row.actualizadoEn.toISOString(),
  };
}

function serializeBackup(row: {
  id: string;
  tipo: string;
  estado: string;
  archivo: string | null;
  tamanoBytes: bigint | null;
  checksum: string | null;
  tablas: number;
  iniciadoEn: Date;
  finalizadoEn: Date | null;
  error: string | null;
}): BackupView {
  return {
    id: row.id,
    type: row.tipo,
    status: row.estado,
    file: row.archivo,
    sizeBytes: row.tamanoBytes === null ? null : Number(row.tamanoBytes),
    checksum: row.checksum,
    tables: row.tablas,
    startedAt: row.iniciadoEn.toISOString(),
    finishedAt: row.finalizadoEn?.toISOString(),
    error: row.error,
  };
}

export async function getBackupConfig() {
  if (isDemoMode()) return demoState.config;
  const row = await prisma.configuracionCopia.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return serializeConfig(row);
}

export async function updateBackupConfig(
  authUserId: string,
  input: Omit<BackupConfigView, "updatedAt">,
) {
  if (isDemoMode()) {
    demoState.config = { ...input, updatedAt: new Date().toISOString() };
    return demoState.config;
  }
  const profile = await prisma.usuario.findUnique({
    where: { authUserId },
    select: { id: true },
  });
  const row = await prisma.configuracionCopia.upsert({
    where: { id: 1 },
    update: {
      frecuencia: input.frequency,
      hora: input.time,
      diaSemana: input.frequency === "SEMANAL" ? input.weekDay : null,
      diaMes: input.frequency === "MENSUAL" ? input.monthDay : null,
      retencion: input.retention,
      incluirAuditoria: input.includeAudit,
      activo: input.active,
      actualizadoPor: profile?.id,
    },
    create: {
      id: 1,
      frecuencia: input.frequency,
      hora: input.time,
      diaSemana: input.frequency === "SEMANAL" ? input.weekDay : null,
      diaMes: input.frequency === "MENSUAL" ? input.monthDay : null,
      retencion: input.retention,
      incluirAuditoria: input.includeAudit,
      activo: input.active,
      actualizadoPor: profile?.id,
    },
  });
  return serializeConfig(row);
}

export async function listBackups() {
  if (isDemoMode()) return demoState.history;
  const rows = await prisma.copiaSeguridad.findMany({
    orderBy: { iniciadoEn: "desc" },
    take: 100,
  });
  return rows.map(serializeBackup);
}

function jsonBuffer(value: unknown) {
  return Buffer.from(
    JSON.stringify(
      value,
      (_key, item) => (typeof item === "bigint" ? item.toString() : item),
      2,
    ),
    "utf8",
  );
}

async function snapshot(includeAudit: boolean) {
  const tables = includeAudit ? [...backupTables, "bitacora"] : [...backupTables];
  const data: Record<string, unknown> = {};
  for (const table of tables) {
    data[table] = await prisma.$queryRawUnsafe(
      `select * from public."${table}"`,
    );
  }
  return {
    tables,
    compressed: gzipSync(
      jsonBuffer({
        product: "SIBI CBN",
        version: 1,
        createdAt: new Date().toISOString(),
        tables: data,
      }),
      { level: 9 },
    ),
  };
}

async function ensureBucket() {
  const supabase = createSupabaseAdminClient();
  const current = await supabase.storage.getBucket("system-backups");
  if (current.error) {
    const created = await supabase.storage.createBucket("system-backups", {
      public: false,
      fileSizeLimit: 200 * 1024 * 1024,
      allowedMimeTypes: ["application/gzip"],
    });
    if (created.error) throw created.error;
  }
  return supabase;
}

export async function createBackup(authUserId?: string, type = "MANUAL") {
  const config = await getBackupConfig();
  if (isDemoMode()) {
    const id = crypto.randomUUID();
    const compressed = gzipSync(
      jsonBuffer({ product: "SIBI CBN", demo: true, createdAt: new Date() }),
    );
    demoState.files.set(id, compressed);
    const item: BackupView = {
      id,
      type,
      status: "COMPLETADA",
      file: `sibi-cbn-demo-${id}.json.gz`,
      sizeBytes: compressed.length,
      checksum: createHash("sha256").update(compressed).digest("hex"),
      tables: 0,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
    };
    demoState.history.unshift(item);
    return item;
  }
  const profile = authUserId
    ? await prisma.usuario.findUnique({
        where: { authUserId },
        select: { id: true },
      })
    : null;
  const execution = await prisma.copiaSeguridad.create({
    data: {
      tipo: type,
      estado: "EN_PROCESO",
      iniciadoPor: profile?.id,
    },
  });
  try {
    if (!isSupabaseAdminConfigured()) {
      throw new Error(
        "Configure SUPABASE_SERVICE_ROLE_KEY para guardar copias privadas.",
      );
    }
    const backup = await snapshot(config.includeAudit);
    const file = `sibi-cbn-${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`;
    const path = `${new Date().getUTCFullYear()}/${file}`;
    const checksum = createHash("sha256")
      .update(backup.compressed)
      .digest("hex");
    const supabase = await ensureBucket();
    const uploaded = await supabase.storage
      .from("system-backups")
      .upload(path, backup.compressed, {
        contentType: "application/gzip",
        upsert: false,
      });
    if (uploaded.error) throw uploaded.error;
    const completed = await prisma.copiaSeguridad.update({
      where: { id: execution.id },
      data: {
        estado: "COMPLETADA",
        archivo: file,
        storagePath: path,
        tamanoBytes: backup.compressed.length,
        checksum,
        tablas: backup.tables.length,
        finalizadoEn: new Date(),
      },
    });
    await applyRetention(config.retention);
    return serializeBackup(completed);
  } catch (error) {
    const failed = await prisma.copiaSeguridad.update({
      where: { id: execution.id },
      data: {
        estado: "FALLIDA",
        error: error instanceof Error ? error.message : "Error desconocido",
        finalizadoEn: new Date(),
      },
    });
    return serializeBackup(failed);
  }
}

async function applyRetention(retention: number) {
  const expired = await prisma.copiaSeguridad.findMany({
    where: { estado: "COMPLETADA" },
    orderBy: { iniciadoEn: "desc" },
    skip: retention,
    select: { id: true, storagePath: true },
  });
  if (!expired.length) return;
  const paths = expired.flatMap((item) =>
    item.storagePath ? [item.storagePath] : [],
  );
  if (paths.length) {
    await createSupabaseAdminClient().storage
      .from("system-backups")
      .remove(paths);
  }
  await prisma.copiaSeguridad.deleteMany({
    where: { id: { in: expired.map((item) => item.id) } },
  });
}

export async function getBackupDownload(id: string) {
  if (isDemoMode()) {
    const buffer = demoState.files.get(id);
    if (!buffer) throw new Error("Copia no encontrada.");
    return { buffer, file: `sibi-cbn-demo-${id}.json.gz` };
  }
  const backup = await prisma.copiaSeguridad.findUnique({ where: { id } });
  if (!backup?.storagePath || backup.estado !== "COMPLETADA") {
    throw new Error("La copia no está disponible.");
  }
  const download = await createSupabaseAdminClient().storage
    .from("system-backups")
    .download(backup.storagePath);
  if (download.error) throw download.error;
  return {
    buffer: Buffer.from(await download.data.arrayBuffer()),
    file: backup.archivo ?? "sibi-cbn-backup.json.gz",
  };
}

export function nextBackupAt(config: BackupConfigView, from = new Date()) {
  const [hour, minute] = config.time.split(":").map(Number);
  const next = new Date(from);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hour + 4, minute, 0, 0);
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
  if (config.frequency === "SEMANAL") {
    while (next.getUTCDay() !== config.weekDay) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
  }
  if (config.frequency === "MENSUAL") {
    next.setUTCDate(config.monthDay ?? 1);
    if (next <= from) next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

export async function runDueBackup(authUserId?: string, now = new Date()) {
  const config = await getBackupConfig();
  if (!config.active) return { executed: false, reason: "Programación inactiva" };
  const history = await listBackups();
  const last = history.find((backup) => backup.status === "COMPLETADA");
  const anchor = new Date(last?.finishedAt ?? config.updatedAt);
  const dueAt = nextBackupAt(config, anchor);
  if (dueAt > now) {
    return { executed: false, reason: "Aún no corresponde", dueAt: dueAt.toISOString() };
  }
  return {
    executed: true,
    dueAt: dueAt.toISOString(),
    backup: await createBackup(authUserId, "PROGRAMADA"),
  };
}
