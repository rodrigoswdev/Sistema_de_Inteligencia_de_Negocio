import "server-only";

import type { Prisma } from "@prisma/client";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import type { AnalyticsFilters } from "@/lib/types";

export interface ReportView {
  id: string;
  name: string;
  module: "EJECUTIVO" | "VENTAS" | "FINANZAS" | "DESEMPENO";
  format: "PDF" | "EXCEL";
  filters: AnalyticsFilters;
  active: boolean;
  createdAt: string;
  schedules: Array<{
    id: string;
    frequency: string;
    recipients: string;
    nextRun: string;
    active: boolean;
  }>;
}

const demoReports = new Map<string, ReportView>([
  [
    "1",
    {
      id: "1",
      name: "Reporte ejecutivo mensual",
      module: "EJECUTIVO",
      format: "PDF",
      filters: {},
      active: true,
      createdAt: "2026-07-25T20:00:00-04:00",
      schedules: [],
    },
  ],
  [
    "2",
    {
      id: "2",
      name: "Ventas por región",
      module: "VENTAS",
      format: "EXCEL",
      filters: {},
      active: true,
      createdAt: "2026-07-24T20:00:00-04:00",
      schedules: [],
    },
  ],
]);

function serialize(row: {
  id: bigint;
  nombre: string;
  tipo: string;
  configuracionJson: Prisma.JsonValue;
  estado: string;
  creadoEn: Date;
  programaciones: Array<{
    id: bigint;
    frecuencia: string;
    destinatarios: string;
    proximaEjecucion: Date;
    activo: boolean;
  }>;
}): ReportView {
  const config = row.configuracionJson as {
    module?: ReportView["module"];
    format?: ReportView["format"];
    filters?: AnalyticsFilters;
  };
  return {
    id: row.id.toString(),
    name: row.nombre,
    module: config.module ?? (row.tipo as ReportView["module"]),
    format: config.format ?? "PDF",
    filters: config.filters ?? {},
    active: row.estado === "ACTIVO",
    createdAt: row.creadoEn.toISOString(),
    schedules: row.programaciones.map((schedule) => ({
      id: schedule.id.toString(),
      frequency: schedule.frecuencia,
      recipients: schedule.destinatarios,
      nextRun: schedule.proximaEjecucion.toISOString(),
      active: schedule.activo,
    })),
  };
}

export async function listReports() {
  if (isDemoMode()) return [...demoReports.values()];
  const rows = await prisma.reporte.findMany({
    orderBy: { creadoEn: "desc" },
    include: {
      programaciones: { orderBy: { proximaEjecucion: "asc" } },
    },
    take: 100,
  });
  return rows.map(serialize);
}

export async function createReport(
  authUserId: string,
  input: {
    name: string;
    module: ReportView["module"];
    format: ReportView["format"];
    filters: AnalyticsFilters;
  },
) {
  if (isDemoMode()) {
    const id = String(Date.now());
    const report: ReportView = {
      id,
      ...input,
      active: true,
      createdAt: new Date().toISOString(),
      schedules: [],
    };
    demoReports.set(id, report);
    return report;
  }
  const profile = await prisma.usuario.findUnique({
    where: { authUserId },
    select: { id: true },
  });
  if (!profile) throw new Error("No existe el perfil local del usuario.");
  const row = await prisma.reporte.create({
    data: {
      nombre: input.name,
      tipo: input.module,
      configuracionJson: {
        module: input.module,
        format: input.format,
        filters: input.filters,
      } as unknown as Prisma.InputJsonValue,
      creadoPor: profile.id,
    },
    include: { programaciones: true },
  });
  return serialize(row);
}

function nextRun(frequency: string, requested: Date) {
  const now = new Date();
  if (requested > now) return requested;
  const next = new Date(now);
  if (frequency === "DIARIA") next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === "SEMANAL") next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === "MENSUAL") next.setUTCMonth(next.getUTCMonth() + 1);
  if (frequency === "TRIMESTRAL") next.setUTCMonth(next.getUTCMonth() + 3);
  return next;
}

export async function scheduleReport(input: {
  reportId: string;
  frequency: string;
  recipients: string;
  nextRun?: Date;
}) {
  if (isDemoMode()) {
    const report = demoReports.get(input.reportId);
    if (!report) throw new Error("Reporte no encontrado.");
    const schedule = {
      id: crypto.randomUUID(),
      frequency: input.frequency,
      recipients: input.recipients,
      nextRun: nextRun(input.frequency, input.nextRun ?? new Date()).toISOString(),
      active: true,
    };
    report.schedules.push(schedule);
    return schedule;
  }
  const schedule = await prisma.reporteProgramado.create({
    data: {
      reporteId: BigInt(input.reportId),
      frecuencia: input.frequency,
      destinatarios: input.recipients,
      proximaEjecucion: nextRun(input.frequency, input.nextRun ?? new Date()),
    },
  });
  return {
    id: schedule.id.toString(),
    frequency: schedule.frecuencia,
    recipients: schedule.destinatarios,
    nextRun: schedule.proximaEjecucion.toISOString(),
    active: schedule.activo,
  };
}

export async function runDueSchedules(at = new Date()) {
  if (isDemoMode()) {
    const due = [...demoReports.values()].flatMap((report) =>
      report.schedules
        .filter((schedule) => schedule.active && new Date(schedule.nextRun) <= at)
        .map((schedule) => ({ report, schedule })),
    );
    for (const item of due) {
      item.schedule.nextRun = nextRun(item.schedule.frequency, at).toISOString();
    }
    return due.map(({ report, schedule }) => ({
      scheduleId: schedule.id,
      reportId: report.id,
      reportName: report.name,
      recipients: schedule.recipients,
      downloadUrl: `/api/reports/export/${report.format === "PDF" ? "pdf" : "excel"}?module=${report.module}`,
      nextRun: schedule.nextRun,
    }));
  }
  const due = await prisma.reporteProgramado.findMany({
    where: { activo: true, proximaEjecucion: { lte: at } },
    include: { reporte: true },
    take: 100,
  });
  const results = [];
  for (const schedule of due) {
    const config = schedule.reporte.configuracionJson as {
      module?: string;
      format?: string;
      filters?: Record<string, string>;
    };
    const upcoming = nextRun(schedule.frecuencia, at);
    await prisma.reporteProgramado.update({
      where: { id: schedule.id },
      data: { proximaEjecucion: upcoming },
    });
    const params = new URLSearchParams({
      module: config.module ?? schedule.reporte.tipo,
      ...(config.filters ?? {}),
    });
    results.push({
      scheduleId: schedule.id.toString(),
      reportId: schedule.reporteId.toString(),
      reportName: schedule.reporte.nombre,
      recipients: schedule.destinatarios,
      downloadUrl: `/api/reports/export/${config.format === "EXCEL" ? "excel" : "pdf"}?${params}`,
      nextRun: upcoming.toISOString(),
    });
  }
  return results;
}
