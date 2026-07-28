import "server-only";

import { demoAlerts } from "@/lib/data/demo";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { loadDataQuality, loadPerformanceRows } from "@/lib/repositories/analytics";

type AlertStatus = "ABIERTA" | "ATENDIDA" | "CERRADA";

type AlertView = {
  id: string;
  severity: string;
  message: string;
  module: string;
  status: AlertStatus;
  period: string;
  createdAt: string;
  attendedAt?: string | null;
  comment?: string | null;
};

const demoStore = new Map<string, AlertView>(
  demoAlerts.map((alert) => [
    String(alert.id),
    { ...alert, id: String(alert.id), status: alert.status as AlertStatus },
  ]),
);

const serialize = (row: {
  id: bigint;
  severidad: string;
  mensaje: string;
  estado: string;
  periodo: string;
  creadaEn: Date;
  atendidaEn: Date | null;
  comentario: string | null;
  kpi: { modulo: string } | null;
}): AlertView => ({
  id: row.id.toString(),
  severity: row.severidad,
  message: row.mensaje,
  module: row.kpi?.modulo ?? "DATOS",
  status: row.estado as AlertStatus,
  period: row.periodo,
  createdAt: row.creadaEn.toISOString(),
  attendedAt: row.atendidaEn?.toISOString(),
  comment: row.comentario,
});

export async function listAlerts() {
  if (isDemoMode()) {
    return [...demoStore.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
  const rows = await prisma.alerta.findMany({
    orderBy: [{ estado: "asc" }, { creadaEn: "desc" }],
    include: { kpi: { select: { modulo: true } } },
    take: 200,
  });
  return rows.map(serialize);
}

export async function updateAlert(
  id: string,
  authUserId: string,
  input: { status: AlertStatus; comment?: string },
) {
  if (isDemoMode()) {
    const current = demoStore.get(id);
    if (!current) throw new Error("Alerta no encontrada.");
    const result = {
      ...current,
      status: input.status,
      comment: input.comment,
      attendedAt:
        input.status === "ABIERTA" ? null : new Date().toISOString(),
    };
    demoStore.set(id, result);
    return result;
  }
  if (!/^\d+$/.test(id)) throw new Error("Identificador de alerta inválido.");
  const profile = await prisma.usuario.findUnique({
    where: { authUserId },
    select: { id: true },
  });
  const row = await prisma.alerta.update({
    where: { id: BigInt(id) },
    data: {
      estado: input.status,
      comentario: input.comment,
      responsableId: profile?.id,
      atendidaEn: input.status === "ABIERTA" ? null : new Date(),
    },
    include: { kpi: { select: { modulo: true } } },
  });
  return serialize(row);
}

export async function generateAlerts() {
  const [performance, quality] = await Promise.all([
    loadPerformanceRows(),
    loadDataQuality(),
  ]);
  const latestPeriod =
    performance.rows.map((row) => row.date.slice(0, 7)).sort().at(-1) ??
    new Date().toISOString().slice(0, 7);
  const latestByUnit = new Map<string, (typeof performance.rows)[number]>();
  for (const row of performance.rows) {
    const current = latestByUnit.get(row.unit);
    if (!current || row.date > current.date) latestByUnit.set(row.unit, row);
  }
  const candidates = [...latestByUnit.values()]
    .filter((row) => row.status !== "VERDE")
    .map((row) => ({
      severity: row.status === "ROJO" ? ("ALTA" as const) : ("MEDIA" as const),
      message: `${row.unit}: ${row.kpi} en ${row.achievement.toFixed(1)}%`,
      period: row.date.slice(0, 7),
    }));
  if (quality !== null && quality < 98) {
    candidates.push({
      severity: quality < 95 ? "ALTA" : "MEDIA",
      message: `Calidad de datos en ${quality.toFixed(2)}%`,
      period: latestPeriod,
    });
  }

  if (isDemoMode()) {
    let created = 0;
    for (const candidate of candidates) {
      if (
        [...demoStore.values()].some(
          (alert) =>
            alert.message === candidate.message &&
            alert.period === candidate.period &&
            alert.status === "ABIERTA",
        )
      ) {
        continue;
      }
      const id = crypto.randomUUID();
      demoStore.set(id, {
        id,
        ...candidate,
        module: candidate.message.startsWith("Calidad")
          ? "DATOS"
          : "DESEMPENO",
        status: "ABIERTA",
        createdAt: new Date().toISOString(),
      });
      created += 1;
    }
    return { evaluated: candidates.length, created };
  }

  let created = 0;
  for (const candidate of candidates) {
    const exists = await prisma.alerta.findFirst({
      where: {
        mensaje: candidate.message,
        periodo: candidate.period,
        estado: "ABIERTA",
      },
      select: { id: true },
    });
    if (!exists) {
      await prisma.alerta.create({
        data: {
          severidad: candidate.severity,
          mensaje: candidate.message,
          periodo: candidate.period,
        },
      });
      created += 1;
    }
  }
  return { evaluated: candidates.length, created };
}
