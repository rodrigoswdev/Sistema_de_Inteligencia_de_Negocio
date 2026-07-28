import {
  getExecutiveDashboard,
  getFinanceAnalytics,
  getPerformanceAnalytics,
  getSalesAnalytics,
} from "@/lib/services/analytics";
import type { AnalyticsFilters } from "@/lib/types";

export type ReportModule =
  | "EJECUTIVO"
  | "VENTAS"
  | "FINANZAS"
  | "DESEMPENO";

export async function reportRows(
  module: ReportModule,
  filters: AnalyticsFilters,
): Promise<Array<Record<string, unknown>>> {
  if (module === "VENTAS") {
    const data = await getSalesAnalytics(filters);
    return data.detail.map((row) => ({
      Fecha: row.date,
      Documento: row.document,
      Región: row.region,
      Producto: row.product,
      Canal: row.channel,
      Cantidad: row.quantity,
      "Venta neta Bs": row.net,
      "Margen Bs": row.margin,
    }));
  }
  if (module === "FINANZAS") {
    const data = await getFinanceAnalytics(filters);
    return data.statement.map((row) => ({
      Concepto: row.concept,
      "Real Bs": row.real,
      "Presupuesto Bs": row.budget,
      "Variación %":
        row.budget === 0 ? null : ((row.real - row.budget) / row.budget) * 100,
    }));
  }
  if (module === "DESEMPENO") {
    const data = await getPerformanceAnalytics(filters);
    return data.matrix.map((row) => ({
      Fecha: row.date,
      Unidad: row.unit,
      KPI: row.kpi,
      Meta: row.target,
      Real: row.value,
      "Cumplimiento %": row.achievement,
      Estado: row.status,
    }));
  }
  const data = await getExecutiveDashboard(filters);
  return data.kpis.map((kpi) => ({
    Código: kpi.code,
    Indicador: kpi.label,
    Resultado: kpi.formatted,
    Estado: kpi.status,
    Detalle: kpi.helper,
  }));
}

export async function reportLines(
  module: ReportModule,
  filters: AnalyticsFilters,
) {
  const rows = await reportRows(module, filters);
  return [
    `SIBI CBN - Reporte ${module}`,
    `Fecha: ${new Date().toLocaleString("es-BO", {
      timeZone: "America/La_Paz",
    })}`,
    `Filtros: ${JSON.stringify(filters)}`,
    "",
    ...rows.slice(0, 36).map((row) =>
      Object.entries(row)
        .map(([key, value]) => `${key}: ${value ?? "-"}`)
        .join(" | "),
    ),
    "",
    `Registros incluidos: ${rows.length}`,
  ];
}
