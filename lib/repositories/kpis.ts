import "server-only";

import type { Prisma } from "@prisma/client";
import { kpiCatalog } from "@/lib/data/demo";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";

type KpiInput = {
  code: string;
  name: string;
  module: "VENTAS" | "FINANZAS" | "DESEMPENO";
  formula: string;
  unit: string;
  direction: "MAYOR_MEJOR" | "MENOR_MEJOR" | "RANGO" | "INFORMATIVO";
  frequency: "DIARIA" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "ANUAL";
  target?: number | null;
  thresholds?: Array<{
    level: "VERDE" | "AMARILLO" | "ROJO";
    from?: number | null;
    to?: number | null;
    color: string;
  }>;
};

type KpiView = KpiInput & { id: string; active: boolean };

const demoKpis = new Map<string, KpiView>(
  kpiCatalog.map(([code, name, module, formula, unit, direction], index) => [
    String(index + 1),
    {
      id: String(index + 1),
      code,
      name,
      module: module as KpiInput["module"],
      formula,
      unit,
      direction,
      frequency: "MENSUAL",
      target: null,
      thresholds: [],
      active: true,
    },
  ]),
);

const serialize = (row: {
  id: bigint;
  codigo: string;
  nombre: string;
  modulo: string;
  formula: string;
  unidad: string;
  sentido: string;
  periodicidad: string;
  meta: Prisma.Decimal | null;
  activo: boolean;
  umbrales: Array<{
    nivel: string;
    valorDesde: Prisma.Decimal | null;
    valorHasta: Prisma.Decimal | null;
    colorTailwind: string;
  }>;
}): KpiView => ({
  id: row.id.toString(),
  code: row.codigo,
  name: row.nombre,
  module: row.modulo as KpiInput["module"],
  formula: row.formula,
  unit: row.unidad,
  direction: row.sentido as KpiInput["direction"],
  frequency: row.periodicidad as KpiInput["frequency"],
  target: row.meta === null ? null : Number(row.meta),
  active: row.activo,
  thresholds: row.umbrales.map((threshold) => ({
    level: threshold.nivel as "VERDE" | "AMARILLO" | "ROJO",
    from: threshold.valorDesde === null ? null : Number(threshold.valorDesde),
    to: threshold.valorHasta === null ? null : Number(threshold.valorHasta),
    color: threshold.colorTailwind,
  })),
});

export async function listKpis() {
  if (isDemoMode()) return [...demoKpis.values()];
  const rows = await prisma.kpiDefinicion.findMany({
    include: { umbrales: { orderBy: { nivel: "asc" } } },
    orderBy: [{ modulo: "asc" }, { codigo: "asc" }],
  });
  return rows.map(serialize);
}

async function profileId(authUserId: string) {
  const profile = await prisma.usuario.findUnique({
    where: { authUserId },
    select: { id: true },
  });
  if (!profile) throw new Error("No existe el perfil local del usuario.");
  return profile.id;
}

export async function createKpi(authUserId: string, input: KpiInput) {
  if (isDemoMode()) {
    const id = crypto.randomUUID();
    const result = { id, ...input, active: true };
    demoKpis.set(id, result);
    return result;
  }
  const creatorId = await profileId(authUserId);
  const row = await prisma.kpiDefinicion.create({
    data: {
      codigo: input.code,
      nombre: input.name,
      modulo: input.module,
      formula: input.formula,
      unidad: input.unit,
      sentido: input.direction,
      periodicidad: input.frequency,
      meta: input.target,
      creadoPor: creatorId,
      umbrales: {
        create: input.thresholds?.map((threshold) => ({
          nivel: threshold.level,
          valorDesde: threshold.from,
          valorHasta: threshold.to,
          colorTailwind: threshold.color,
        })),
      },
    },
    include: { umbrales: true },
  });
  return serialize(row);
}

export async function updateKpi(id: string, input: Partial<KpiInput> & { active?: boolean }) {
  if (isDemoMode()) {
    const current = demoKpis.get(id);
    if (!current) throw new Error("KPI no encontrado.");
    const result = { ...current, ...input };
    demoKpis.set(id, result);
    return result;
  }
  if (!/^\d+$/.test(id)) throw new Error("Identificador de KPI inválido.");
  const row = await prisma.$transaction(async (tx) => {
    if (input.thresholds) {
      await tx.kpiUmbral.deleteMany({ where: { kpiId: BigInt(id) } });
    }
    return tx.kpiDefinicion.update({
      where: { id: BigInt(id) },
      data: {
        codigo: input.code,
        nombre: input.name,
        modulo: input.module,
        formula: input.formula,
        unidad: input.unit,
        sentido: input.direction,
        periodicidad: input.frequency,
        meta: input.target,
        activo: input.active,
        umbrales: input.thresholds
          ? {
              create: input.thresholds.map((threshold) => ({
                nivel: threshold.level,
                valorDesde: threshold.from,
                valorHasta: threshold.to,
                colorTailwind: threshold.color,
              })),
            }
          : undefined,
      },
      include: { umbrales: true },
    });
  });
  return serialize(row);
}
