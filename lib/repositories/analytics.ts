import "server-only";

import { DATA_UPDATED_AT, finances, performances, sales } from "@/lib/data/demo";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export interface SalesAnalyticsRow {
  id: string;
  date: string;
  document: string;
  region: string;
  department: string;
  branch: string;
  product: string;
  category: string;
  channel: string;
  employee: string;
  quantity: number;
  gross: number;
  discounts: number;
  returns: number;
  net: number;
  cost: number;
  margin: number;
  target: number;
}

export interface FinanceAnalyticsRow {
  id: string;
  date: string;
  area: string;
  costCenter: string;
  region: string;
  income: number;
  costs: number;
  opex: number;
  budget: number;
  cashFlow: number;
  scenario?: string;
}

export interface PerformanceAnalyticsRow {
  id: string;
  date: string;
  unit: string;
  kpi: string;
  target: number;
  value: number;
  achievement: number;
  status: "VERDE" | "AMARILLO" | "ROJO" | "NEUTRO";
}

export interface AnalyticsDataset<T> {
  rows: T[];
  updatedAt: string;
  source: "SUPABASE" | "DEMO" | "DEMO_FALLBACK";
}

const globalAnalytics = globalThis as unknown as {
  sibiDemoSales?: Map<string, SalesAnalyticsRow>;
  sibiDemoSalesUpdatedAt?: string;
};

const demoSalesStore =
  globalAnalytics.sibiDemoSales ??
  new Map(
    sales.map((sale) => [
      sale.id,
      { ...sale } satisfies SalesAnalyticsRow,
    ]),
  );
globalAnalytics.sibiDemoSales = demoSalesStore;

export function addDemoSalesRows(rows: Array<Record<string, string>>) {
  const created: SalesAnalyticsRow[] = [];
  for (const input of rows) {
    const gross = Number(input.venta_bruta);
    const discounts = Number(input.descuento || 0);
    const returns = Number(input.devolucion || 0);
    const cost = Number(input.costo);
    const net = gross - discounts - returns;
    const existing = [...demoSalesStore.values()].find(
      (sale) =>
        sale.document === input.documento &&
        sale.product === input.producto_nombre,
    );
    const sale: SalesAnalyticsRow = {
      id: existing?.id ?? crypto.randomUUID(),
      date: input.fecha,
      document: input.documento,
      region: input.region,
      department: input.sucursal_nombre,
      branch: input.sucursal_nombre,
      product: input.producto_nombre,
      category: input.categoria,
      channel: input.canal_nombre,
      employee: input.empleado_nombre || "Sin asignar",
      quantity: Number(input.cantidad),
      gross,
      discounts,
      returns,
      net,
      cost,
      margin: net - cost,
      target: Number(input.meta_venta || 0),
    };
    demoSalesStore.set(sale.id, sale);
    created.push(sale);
  }
  globalAnalytics.sibiDemoSalesUpdatedAt = new Date().toISOString();
  return created;
}

const isoDate = (value: Date) => value.toISOString().slice(0, 10);

async function latestUpdate(module: "VENTAS" | "FINANZAS" | "DESEMPENO") {
  const load = await prisma.cargaDato.findFirst({
    where: { modulo: module, estado: "COMPLETADA" },
    orderBy: { fechaFin: "desc" },
    select: { fechaFin: true, fechaInicio: true },
  });
  return (load?.fechaFin ?? load?.fechaInicio)?.toISOString() ?? DATA_UPDATED_AT;
}

function fallback<T>(rows: T[], error: unknown): AnalyticsDataset<T> {
  console.error(
    "Supabase no disponible; se usan datos demostrativos:",
    error instanceof Error ? error.message : "error desconocido",
  );
  return { rows, updatedAt: DATA_UPDATED_AT, source: "DEMO_FALLBACK" };
}

export async function loadSalesRows(): Promise<
  AnalyticsDataset<SalesAnalyticsRow>
> {
  if (isDemoMode()) {
    return {
      rows: [...demoSalesStore.values()],
      updatedAt: globalAnalytics.sibiDemoSalesUpdatedAt ?? DATA_UPDATED_AT,
      source: "DEMO",
    };
  }
  try {
    const records = await prisma.factVenta.findMany({
      take: 50_000,
      orderBy: { fechaId: "asc" },
      include: {
        fecha: true,
        producto: true,
        sucursal: true,
        canal: true,
        empleado: true,
      },
    });
    return {
      rows: records.map((row) => ({
        id: row.ventaId.toString(),
        date: isoDate(row.fecha.fecha),
        document: row.documento,
        region: row.sucursal.region,
        department: row.sucursal.ciudad ?? row.sucursal.nombre,
        branch: row.sucursal.nombre,
        product: row.producto.nombre,
        category: row.producto.categoria,
        channel: row.canal.nombre,
        employee: row.empleado?.nombre ?? "Sin asignar",
        quantity: Number(row.cantidad),
        gross: Number(row.ventaBruta),
        discounts: Number(row.descuento),
        returns: Number(row.devolucion),
        net: Number(row.ventaNeta),
        cost: Number(row.costo),
        margin: Number(row.margen),
        target: Number(row.metaVenta),
      })),
      updatedAt: await latestUpdate("VENTAS"),
      source: "SUPABASE",
    };
  } catch (error) {
    return fallback([...demoSalesStore.values()], error);
  }
}

export async function loadFinanceRows(): Promise<
  AnalyticsDataset<FinanceAnalyticsRow>
> {
  if (isDemoMode()) {
    return { rows: finances, updatedAt: DATA_UPDATED_AT, source: "DEMO" };
  }
  try {
    const records = await prisma.factFinanza.findMany({
      take: 50_000,
      orderBy: { fechaId: "asc" },
      include: {
        fecha: true,
        cuenta: true,
        centroCosto: true,
        sucursal: true,
        escenario: true,
      },
    });
    return {
      rows: records.map((row) => {
        const amount = Number(row.importe);
        const actual = row.escenario.codigo === "REAL";
        const type = row.cuenta.tipo.toUpperCase();
        return {
          id: row.finanzaId.toString(),
          date: isoDate(row.fecha.fecha),
          area:
            row.centroCosto?.unidad ??
            row.centroCosto?.nombre ??
            row.cuenta.nombre,
          costCenter: row.centroCosto?.nombre ?? "Sin centro de costo",
          region: row.sucursal?.region ?? "Corporativo",
          income: actual && type.includes("INGRES") ? amount : 0,
          costs: actual && type.includes("COST") ? amount : 0,
          opex:
            actual && !type.includes("INGRES") && !type.includes("COST")
              ? amount
              : 0,
          budget: actual ? 0 : amount,
          cashFlow: Number(row.debito) - Number(row.credito),
          scenario: row.escenario.codigo,
        };
      }),
      updatedAt: await latestUpdate("FINANZAS"),
      source: "SUPABASE",
    };
  } catch (error) {
    return fallback(finances, error);
  }
}

export async function loadDataQuality() {
  if (isDemoMode()) return 96.8;
  try {
    const loads = await prisma.cargaDato.findMany({
      where: { estado: { in: ["COMPLETADA", "CON_ERRORES"] } },
      orderBy: { fechaInicio: "desc" },
      take: 20,
      select: { filasTotales: true, filasValidas: true },
    });
    const total = loads.reduce((sum, load) => sum + load.filasTotales, 0);
    const valid = loads.reduce((sum, load) => sum + load.filasValidas, 0);
    return total === 0 ? null : Number(((valid / total) * 100).toFixed(2));
  } catch {
    return 96.8;
  }
}

export async function loadPerformanceRows(): Promise<
  AnalyticsDataset<PerformanceAnalyticsRow>
> {
  if (isDemoMode()) {
    return { rows: performances, updatedAt: DATA_UPDATED_AT, source: "DEMO" };
  }
  try {
    const records = await prisma.factDesempeno.findMany({
      take: 50_000,
      orderBy: { fechaId: "asc" },
      include: { fecha: true, kpi: true, unidad: true },
    });
    return {
      rows: records.map((row) => ({
        id: row.desempenoId.toString(),
        date: isoDate(row.fecha.fecha),
        unit: row.unidad.nombre,
        kpi: row.kpi.nombre,
        target: Number(row.valorMeta),
        value: Number(row.valorReal),
        achievement: Number(row.cumplimiento),
        status: row.estado,
      })),
      updatedAt: await latestUpdate("DESEMPENO"),
      source: "SUPABASE",
    };
  } catch (error) {
    return fallback(performances, error);
  }
}

export async function loadMetadata() {
  if (isDemoMode()) return null;
  try {
    const [regions, products, channels, units, scenarios, periods] =
      await Promise.all([
        prisma.dimSucursal.findMany({
          distinct: ["region"],
          select: { region: true },
          orderBy: { region: "asc" },
        }),
        prisma.dimProducto.findMany({
          where: { estado: "ACTIVO" },
          select: { nombre: true },
          orderBy: { nombre: "asc" },
        }),
        prisma.dimCanal.findMany({
          select: { nombre: true },
          orderBy: { nombre: "asc" },
        }),
        prisma.dimUnidad.findMany({
          where: { estado: "ACTIVO" },
          select: { nombre: true },
          orderBy: { nombre: "asc" },
        }),
        prisma.dimEscenario.findMany({
          select: { codigo: true },
          orderBy: { codigo: "asc" },
        }),
        prisma.cargaDato.findMany({
          where: { estado: "COMPLETADA" },
          distinct: ["periodo"],
          select: { periodo: true },
          orderBy: { periodo: "desc" },
          take: 24,
        }),
      ]);
    return {
      periods: periods.map((row) => row.periodo),
      regions: regions.map((row) => row.region),
      products: products.map((row) => row.nombre),
      channels: channels.map((row) => row.nombre),
      units: units.map((row) => row.nombre),
      scenarios: scenarios.map((row) => row.codigo),
    };
  } catch (error) {
    console.error(
      "No se pudieron cargar los filtros reales:",
      error instanceof Error ? error.message : "error desconocido",
    );
    return null;
  }
}
