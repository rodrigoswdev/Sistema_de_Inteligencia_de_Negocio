import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import {
  loadFinanceRows,
  loadDataQuality,
  loadMetadata,
  loadPerformanceRows,
  loadSalesRows,
} from "@/lib/repositories/analytics";
import {
  achievement,
  averageTicket,
  budgetVariance,
  ebitda,
  grossMargin,
  growth,
  higherIsBetter,
} from "@/lib/kpi/formulas";
import type { AnalyticsFilters, ChartPoint, KpiValue } from "@/lib/types";

const inRange = (date: string, filters: AnalyticsFilters) =>
  (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);

const matches = (value: string, filter?: string) =>
  !filter || filter === "TODOS" || value === filter;

const sum = <T,>(rows: T[], getter: (row: T) => number) =>
  rows.reduce((total, row) => total + getter(row), 0);

const grouped = <T,>(
  rows: T[],
  key: (row: T) => string,
  value: (row: T) => number,
): ChartPoint[] => {
  const values = new Map<string, number>();
  rows.forEach((row) =>
    values.set(key(row), (values.get(key(row)) ?? 0) + value(row)),
  );
  return [...values.entries()].map(([label, total]) => ({
    label,
    value: Math.round(total * 100) / 100,
  }));
};

export async function getSalesAnalytics(filters: AnalyticsFilters = {}) {
  const dataset = await loadSalesRows();
  const rows = dataset.rows.filter(
    (row) =>
      inRange(row.date, filters) &&
      matches(row.region, filters.region) &&
      matches(row.product, filters.product) &&
      matches(row.channel, filters.channel),
  );
  const net = sum(rows, (row) => row.net);
  const cost = sum(rows, (row) => row.cost);
  const target = sum(rows, (row) => row.target);
  const months = [...new Set(rows.map((row) => row.date.slice(0, 7)))].sort();
  const currentMonth = months.at(-1);
  const previousMonth = months.at(-2);
  const current = sum(
    rows.filter((row) => row.date.startsWith(currentMonth ?? "")),
    (row) => row.net,
  );
  const previous = sum(
    rows.filter((row) => row.date.startsWith(previousMonth ?? "")),
    (row) => row.net,
  );
  const margin = grossMargin(net, cost);
  const compliance = achievement(net, target);
  const salesGrowth = growth(current, previous);
  const kpis: KpiValue[] = [
    {
      code: "VEN-01",
      label: "Ventas netas",
      value: net,
      formatted: formatMoney(net, true),
      variation: salesGrowth,
      helper: "Venta bruta menos descuentos y devoluciones",
      status: higherIsBetter(compliance, 100, 90),
    },
    {
      code: "VEN-03",
      label: "Unidades",
      value: sum(rows, (row) => row.quantity),
      formatted: formatNumber(sum(rows, (row) => row.quantity), "unid."),
      variation: 5.1,
      helper: "Cantidad total vendida",
      status: "VERDE",
    },
    {
      code: "VEN-04",
      label: "Ticket promedio",
      value: averageTicket(net, new Set(rows.map((row) => row.document)).size),
      formatted: formatMoney(
        averageTicket(net, new Set(rows.map((row) => row.document)).size),
      ),
      variation: 2.9,
      helper: "Venta neta por documento",
      status: "VERDE",
    },
    {
      code: "VEN-05",
      label: "Margen bruto",
      value: margin,
      formatted: formatPercent(margin),
      variation: -0.8,
      helper: "Margen sobre la venta neta",
      status: higherIsBetter(margin, 38, 34),
    },
  ];
  return {
    kpis,
    monthly: grouped(rows, (row) => row.date.slice(0, 7), (row) => row.net),
    byProduct: grouped(rows, (row) => row.product, (row) => row.net).sort(
      (a, b) => b.value - a.value,
    ),
    byRegion: grouped(rows, (row) => row.region, (row) => row.net),
    byChannel: grouped(rows, (row) => row.channel, (row) => row.net),
    detail: rows,
    universe: rows.length,
    updatedAt: dataset.updatedAt,
    dataSource: dataset.source,
  };
}

export async function getFinanceAnalytics(filters: AnalyticsFilters = {}) {
  const dataset = await loadFinanceRows();
  const rows = dataset.rows.filter(
    (row) =>
      inRange(row.date, filters) &&
      matches(row.region, filters.region) &&
      matches(row.scenario ?? "REAL", filters.scenario),
  );
  const income = sum(rows, (row) => row.income);
  const costs = sum(rows, (row) => row.costs);
  const opex = sum(rows, (row) => row.opex);
  const budget = sum(rows, (row) => row.budget);
  const result = ebitda(income, costs, opex);
  const margin = income === 0 ? null : (result / income) * 100;
  const variance = budgetVariance(income, budget);
  const kpis: KpiValue[] = [
    {
      code: "FIN-01",
      label: "Ingresos",
      value: income,
      formatted: formatMoney(income, true),
      variation: 8.2,
      helper: "Ingresos netos del periodo",
      status: higherIsBetter(achievement(income, budget), 100, 95),
    },
    {
      code: "FIN-02",
      label: "Costo de ventas",
      value: costs,
      formatted: formatMoney(costs, true),
      helper: formatPercent(income ? (costs / income) * 100 : null),
      status: "AMARILLO",
    },
    {
      code: "FIN-03",
      label: "EBITDA",
      value: result,
      formatted: formatMoney(result, true),
      helper: `${formatPercent(margin)} de margen`,
      status: higherIsBetter(margin, 18, 15),
    },
    {
      code: "FIN-05",
      label: "Desviación presupuesto",
      value: variance,
      formatted: formatPercent(variance),
      helper: variance !== null && variance >= 0 ? "Favorable" : "Revisar",
      status:
        variance !== null && Math.abs(variance) <= 5
          ? "VERDE"
          : variance !== null && Math.abs(variance) <= 10
            ? "AMARILLO"
            : "ROJO",
    },
  ];
  return {
    kpis,
    monthly: [...new Set(rows.map((row) => row.date.slice(0, 7)))].map(
      (month) => {
        const monthRows = rows.filter((row) => row.date.startsWith(month));
        return {
          label: month,
          value: sum(monthRows, (row) => row.income),
          comparison: sum(monthRows, (row) => row.budget),
        };
      },
    ),
    byCostCenter: grouped(rows, (row) => row.area, (row) => row.opex),
    statement: [
      { concept: "Ingresos netos", real: income, budget },
      { concept: "Costo de ventas", real: costs, budget: budget * 0.61 },
      { concept: "Gastos operativos", real: opex, budget: budget * 0.16 },
      { concept: "EBITDA", real: result, budget: budget * 0.19 },
    ],
    universe: rows.length,
    updatedAt: dataset.updatedAt,
    dataSource: dataset.source,
  };
}

export async function getPerformanceAnalytics(filters: AnalyticsFilters = {}) {
  const [dataset, dataQuality] = await Promise.all([
    loadPerformanceRows(),
    loadDataQuality(),
  ]);
  const rows = dataset.rows.filter(
    (row) =>
      inRange(row.date, filters) && matches(row.unit, filters.unit),
  );
  const latest = [...new Set(rows.map((row) => row.unit))].map((unit) =>
    rows
      .filter((row) => row.unit === unit)
      .sort((a, b) => b.date.localeCompare(a.date))[0],
  );
  const global =
    latest.length === 0
      ? null
      : latest.reduce((total, row) => total + row.achievement, 0) /
        latest.length;
  const green = latest.filter((row) => row.status === "VERDE").length;
  const red = latest.filter((row) => row.status === "ROJO").length;
  const kpis: KpiValue[] = [
    {
      code: "DES-01",
      label: "Cumplimiento global",
      value: global,
      formatted: formatPercent(global),
      helper: "Promedio ponderado de metas",
      status: higherIsBetter(global, 95, 90),
    },
    {
      code: "DES-02",
      label: "Unidades en verde",
      value: green,
      formatted: `${green} de ${latest.length}`,
      helper: "Unidades que cumplen el umbral",
      status: green / Math.max(latest.length, 1) >= 0.8 ? "VERDE" : "AMARILLO",
    },
    {
      code: "DES-RED",
      label: "Unidades en rojo",
      value: red,
      formatted: formatNumber(red),
      helper: "Requieren acción prioritaria",
      status: red === 0 ? "VERDE" : "ROJO",
    },
    {
      code: "DAT-01",
      label: "KPI actualizados",
      value: dataQuality,
      formatted: formatPercent(dataQuality),
      helper: "Frescura y completitud",
      status: higherIsBetter(dataQuality, 98, 95),
    },
  ];
  return {
    kpis,
    matrix: latest,
    ranking: latest
      .map((row) => ({
        label: row.unit,
        value: row.achievement,
        status: row.status,
      }))
      .sort((a, b) => b.value - a.value),
    underThreshold: latest.filter((row) => row.status !== "VERDE"),
    universe: rows.length,
    updatedAt: dataset.updatedAt,
    dataSource: dataset.source,
  };
}

export async function getExecutiveDashboard(filters: AnalyticsFilters = {}) {
  const [salesData, financeData, performanceData] = await Promise.all([
    getSalesAnalytics(filters),
    getFinanceAnalytics(filters),
    getPerformanceAnalytics(filters),
  ]);
  const salesNet = salesData.kpis[0];
  const ebitdaValue = financeData.kpis[2];
  const compliance = performanceData.kpis[0];
  const critical = performanceData.underThreshold.filter(
    (row) => row.status === "ROJO",
  ).length;
  return {
    kpis: [
      salesNet,
      ebitdaValue,
      compliance,
      {
        code: "EJE-01",
        label: "Alertas críticas",
        value: critical,
        formatted: formatNumber(critical),
        helper: "Requieren decisión",
        status: critical === 0 ? ("VERDE" as const) : ("ROJO" as const),
      },
    ],
    trend: salesData.monthly.map((point, index) => ({
      ...point,
      comparison: financeData.monthly[index]?.value ?? 0,
    })),
    traffic: [
      { label: "Ventas netas", status: salesNet.status },
      { label: "Margen EBITDA", status: ebitdaValue.status },
      { label: "Gasto operativo", status: financeData.kpis[1].status },
      { label: "Meta de desempeño", status: compliance.status },
      { label: "Calidad de datos", status: "ROJO" as const },
    ],
    alerts: performanceData.underThreshold,
    universe:
      salesData.universe + financeData.universe + performanceData.universe,
    updatedAt: [
      salesData.updatedAt,
      financeData.updatedAt,
      performanceData.updatedAt,
    ]
      .sort()
      .at(-1) ?? salesData.updatedAt,
    dataSource:
      salesData.dataSource === "SUPABASE" &&
      financeData.dataSource === "SUPABASE" &&
      performanceData.dataSource === "SUPABASE"
        ? "SUPABASE"
        : salesData.dataSource === "DEMO" &&
            financeData.dataSource === "DEMO" &&
            performanceData.dataSource === "DEMO"
          ? "DEMO"
          : "DEMO_FALLBACK",
  };
}

const demoMetadata = {
  periods: ["2026-01-01/2026-07-31", "2026-04-01/2026-07-31"],
  regions: ["Occidente", "Oriente", "Centro", "Sur"],
  products: ["Paceña Pilsener", "Huari Tradicional", "Malta Real"],
  channels: ["Tradicional", "Moderno", "Distribuidor"],
  units: ["Ventas", "Finanzas", "Operaciones", "Logística", "Administración"],
  scenarios: ["REAL", "PRESUPUESTO"],
};

export async function getMetadata() {
  return (await loadMetadata()) ?? demoMetadata;
}

