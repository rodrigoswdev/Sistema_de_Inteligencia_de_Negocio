import { AlertTriangle, Download } from "lucide-react";
import { getExecutiveDashboard, getMetadata } from "@/lib/services/analytics";
import { filtersFromSearchParams } from "@/lib/analytics/filters";
import { Bars, DataFreshness, FilterBar, KpiGrid, PageHeader, Status } from "@/components/dashboard/ui";

export default async function ExecutivePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = filtersFromSearchParams(await searchParams);
  const [data, options] = await Promise.all([getExecutiveDashboard(filters), getMetadata()]);
  return <>
    <PageHeader title="Resumen ejecutivo" subtitle={`Visión consolidada del negocio · Actualizado ${new Date(data.updatedAt).toLocaleString("es-BO")}`} action={<a className="button secondary" href="/api/reports/export/pdf"><Download size={16} /> Exportar PDF</a>} />
    <DataFreshness updatedAt={data.updatedAt} source={data.dataSource} />
    <FilterBar filters={filters} options={options} />
    <KpiGrid values={data.kpis} />
    <section className="grid-2">
      <article className="card panel"><h2 className="panel-title">Tendencia consolidada</h2><Bars data={data.trend} /></article>
      <article className="card panel"><h2 className="panel-title">Semáforo corporativo</h2><div className="bars">{data.traffic.map((row) => <div className="bar-row" style={{ gridTemplateColumns: "1fr auto" }} key={row.label}><span>{row.label}</span><Status value={row.status} /></div>)}</div></article>
    </section>
    <article className="card panel"><h2 className="panel-title"><AlertTriangle size={17} style={{ display: "inline", marginRight: 7 }} />Indicadores que requieren atención</h2>
      <div className="table-wrap"><table><thead><tr><th>Unidad</th><th>Indicador</th><th>Resultado</th><th>Estado</th></tr></thead><tbody>{data.alerts.map((row) => <tr key={row.id}><td>{row.unit}</td><td>{row.kpi}</td><td>{row.achievement.toFixed(1)}%</td><td><Status value={row.status} /></td></tr>)}</tbody></table></div>
    </article>
  </>;
}
