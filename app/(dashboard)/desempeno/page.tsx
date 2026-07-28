import { getMetadata, getPerformanceAnalytics } from "@/lib/services/analytics";
import { filtersFromSearchParams } from "@/lib/analytics/filters";
import { Bars, DataFreshness, FilterBar, KpiGrid, PageHeader, Status } from "@/components/dashboard/ui";

export default async function PerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = filtersFromSearchParams(await searchParams);
  const [data, options] = await Promise.all([getPerformanceAnalytics(filters), getMetadata()]);
  return <>
    <PageHeader title="Desempeño organizacional" subtitle="Cumplimiento de metas por unidad y responsable" />
    <DataFreshness updatedAt={data.updatedAt} source={data.dataSource} />
    <FilterBar unit filters={filters} options={options} /><KpiGrid values={data.kpis} />
    <section className="grid-2">
      <article className="card panel"><h2 className="panel-title">Ranking de unidades</h2><Bars data={data.ranking} drilldownParam="unit" /></article>
      <article className="card panel"><h2 className="panel-title">Matriz de cumplimiento</h2><table><thead><tr><th>Unidad</th><th>KPI</th><th>Cumplimiento</th><th>Estado</th></tr></thead><tbody>{data.matrix.map(row => <tr key={row.id}><td>{row.unit}</td><td>{row.kpi}</td><td>{row.achievement.toFixed(1)}%</td><td><Status value={row.status} /></td></tr>)}</tbody></table></article>
    </section>
  </>;
}
