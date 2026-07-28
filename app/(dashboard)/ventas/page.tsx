import { Download } from "lucide-react";
import { getMetadata, getSalesAnalytics } from "@/lib/services/analytics";
import { filtersFromSearchParams } from "@/lib/analytics/filters";
import { Bars, DataFreshness, FilterBar, KpiGrid, PageHeader } from "@/components/dashboard/ui";
import { formatMoney } from "@/lib/format";

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = filtersFromSearchParams(await searchParams);
  const [data, options] = await Promise.all([getSalesAnalytics(filters), getMetadata()]);
  return <>
    <PageHeader title="Análisis de ventas" subtitle="Seguimiento comercial por producto, región y canal" action={<a className="button secondary" href="/api/reports/export/excel"><Download size={16} /> Exportar Excel</a>} />
    <DataFreshness updatedAt={data.updatedAt} source={data.dataSource} />
    <FilterBar sales filters={filters} options={options} /><KpiGrid values={data.kpis} />
    <section className="grid-2">
      <article className="card panel"><h2 className="panel-title">Ventas mensuales</h2><Bars data={data.monthly} /></article>
      <article className="card panel"><h2 className="panel-title">Participación por producto</h2><Bars data={data.byProduct} orange drilldownParam="product" /></article>
    </section>
    <article className="card panel"><h2 className="panel-title">Detalle comercial</h2><div className="table-wrap"><table><thead><tr><th>Periodo</th><th>Región</th><th>Producto</th><th>Canal</th><th>Venta neta</th><th>Margen</th></tr></thead><tbody>{data.detail.slice(0, 12).map(row => <tr key={row.id}><td>{row.date}</td><td>{row.region}</td><td>{row.product}</td><td>{row.channel}</td><td>{formatMoney(row.net)}</td><td>{formatMoney(row.margin)}</td></tr>)}</tbody></table></div></article>
  </>;
}
