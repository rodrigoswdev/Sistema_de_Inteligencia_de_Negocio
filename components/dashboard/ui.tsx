import type { AnalyticsFilters, ChartPoint, KpiValue, TrafficLight } from "@/lib/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <header className="page-head"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</header>;
}

export function FilterBar({
  unit = false,
  sales = false,
  filters = {},
  options,
}: {
  unit?: boolean;
  sales?: boolean;
  filters?: AnalyticsFilters;
  options?: {
    regions: string[];
    products: string[];
    channels: string[];
    units: string[];
    scenarios: string[];
  };
}) {
  const values = unit ? options?.units : options?.regions;
  return <form className="card filters" method="get">
    <label className="field">Desde<input type="date" name="from" defaultValue={filters.from} /></label>
    <label className="field">Hasta<input type="date" name="to" defaultValue={filters.to} /></label>
    <label className="field">{unit ? "Unidad" : "Región"}<select name={unit ? "unit" : "region"} defaultValue={unit ? filters.unit ?? "TODOS" : filters.region ?? "TODOS"}><option>TODOS</option>{values?.map((item) => <option key={item}>{item}</option>)}</select></label>
    {sales ? <label className="field">Producto<select name="product" defaultValue={filters.product ?? "TODOS"}><option>TODOS</option>{options?.products.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
    {sales ? <label className="field">Canal<select name="channel" defaultValue={filters.channel ?? "TODOS"}><option>TODOS</option>{options?.channels.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
    {!unit ? <label className="field">Escenario<select name="scenario" defaultValue={filters.scenario ?? "TODOS"}><option>TODOS</option>{options?.scenarios.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
    <button className="button" style={{ alignSelf: "end" }}>Aplicar filtros</button>
  </form>;
}

export function KpiGrid({ values }: { values: KpiValue[] }) {
  return <section className="kpi-grid">{values.map((item) => <article className="card kpi" key={item.code}>
    <div className="kpi-label"><span className={`dot ${item.status}`} />{item.label}</div>
    <div className="kpi-value">{item.formatted}</div>
    <div className="kpi-helper">{item.variation != null ? `${item.variation >= 0 ? "▲" : "▼"} ${Math.abs(item.variation).toLocaleString("es-BO")}% · ` : ""}{item.helper}</div>
  </article>)}</section>;
}

export function Bars({ data, orange = false, drilldownParam }: { data: ChartPoint[]; orange?: boolean; drilldownParam?: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return <div className="bars">{data.slice(0, 8).map((item) => <div className="bar-row" key={item.label}>
    <span>{drilldownParam ? <a href={`?${drilldownParam}=${encodeURIComponent(item.label)}`}>{item.label}</a> : item.label}</span><div className="bar-track"><div className={`bar-fill ${orange ? "orange" : ""}`} style={{ width: `${Math.max(4, item.value / max * 100)}%` }} /></div><strong>{item.value.toLocaleString("es-BO", { maximumFractionDigits: 0 })}</strong>
  </div>)}</div>;
}

export function Status({ value }: { value: TrafficLight | string }) {
  return <span className="badge"><span className={`dot ${value}`} />{value}</span>;
}

export function DataFreshness({
  updatedAt,
  source,
}: {
  updatedAt: string;
  source: string;
}) {
  const label =
    source === "SUPABASE"
      ? "Datos reales de Supabase"
      : source === "DEMO"
        ? "Modo demostración"
        : "Supabase no disponible · respaldo demostrativo";
  return (
    <div className="demo-note" style={{ marginBottom: 18 }}>
      <strong>{label}</strong> · Actualizado{" "}
      {new Date(updatedAt).toLocaleString("es-BO", {
        timeZone: "America/La_Paz",
      })}
    </div>
  );
}
