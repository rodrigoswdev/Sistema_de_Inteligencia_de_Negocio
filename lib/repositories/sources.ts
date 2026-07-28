import type { Prisma } from "@prisma/client";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";

const demoSources = [
  {
    id: "1",
    name: "Ventas CSV",
    type: "CSV",
    module: "VENTAS",
    frequency: "MENSUAL",
    active: true,
    configuration: { delimiter: ",", encoding: "UTF-8" },
  },
  {
    id: "2",
    name: "Contabilidad",
    type: "EXCEL",
    module: "FINANZAS",
    frequency: "MENSUAL",
    active: true,
    configuration: { sheet: "Movimientos" },
  },
  {
    id: "3",
    name: "Metas organizacionales",
    type: "EXCEL",
    module: "DESEMPENO",
    frequency: "TRIMESTRAL",
    active: true,
    configuration: { sheet: "Metas" },
  },
];

const serialize = (row: {
  id: bigint;
  nombre: string;
  tipo: string;
  modulo: string;
  frecuencia: string | null;
  estado: string;
  configuracionJson: Prisma.JsonValue | null;
}) => ({
  id: row.id.toString(),
  name: row.nombre,
  type: row.tipo,
  module: row.modulo,
  frequency: row.frecuencia,
  active: row.estado === "ACTIVO",
  configuration: row.configuracionJson,
});

export async function listSources() {
  if (isDemoMode()) return demoSources;
  const rows = await prisma.fuenteDato.findMany({
    orderBy: [{ modulo: "asc" }, { nombre: "asc" }],
  });
  return rows.map(serialize);
}

export async function createSource(input: {
  name: string;
  type: string;
  module: "VENTAS" | "FINANZAS" | "DESEMPENO";
  frequency?: string;
  configuration?: Record<string, unknown>;
}) {
  if (isDemoMode()) {
    return {
      id: crypto.randomUUID(),
      ...input,
      active: true,
      configuration: input.configuration ?? {},
    };
  }
  const row = await prisma.fuenteDato.create({
    data: {
      nombre: input.name,
      tipo: input.type,
      modulo: input.module,
      frecuencia: input.frequency,
      configuracionJson: input.configuration as Prisma.InputJsonValue,
    },
  });
  return serialize(row);
}

export async function updateSource(
  id: string,
  input: {
    name?: string;
    type?: string;
    module?: "VENTAS" | "FINANZAS" | "DESEMPENO";
    frequency?: string | null;
    active?: boolean;
    configuration?: Record<string, unknown>;
  },
) {
  if (isDemoMode()) {
    const current = demoSources.find((source) => source.id === id);
    if (!current) throw new Error("Fuente no encontrada.");
    return { ...current, ...input };
  }
  if (!/^\d+$/.test(id)) throw new Error("Identificador de fuente inválido.");
  const row = await prisma.fuenteDato.update({
    where: { id: BigInt(id) },
    data: {
      nombre: input.name,
      tipo: input.type,
      modulo: input.module,
      frecuencia: input.frequency,
      estado:
        input.active === undefined
          ? undefined
          : input.active
            ? "ACTIVO"
            : "INACTIVO",
      configuracionJson: input.configuration as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
  return serialize(row);
}
