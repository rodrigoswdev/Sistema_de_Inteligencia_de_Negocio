import { filtersFromSearchParams } from "@/lib/analytics/filters";
import {
  Bars,
  DataFreshness,
  FilterBar,
  KpiGrid,
  PageHeader,
} from "@/components/dashboard/ui";
import { ExportActions } from "@/components/reports/export-actions";
import { formatMoney } from "@/lib/format";
import { getFinanceAnalytics, getMetadata } from "@/lib/services/analytics";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = filtersFromSearchParams(await searchParams);
  const [data, options] = await Promise.all([
    getFinanceAnalytics(filters),
    getMetadata(),
  ]);
  return (
    <>
      <PageHeader
        title="Análisis financiero"
        subtitle="Estado de resultados, presupuesto y centros de costo"
        action={<ExportActions module="FINANZAS" filters={filters} />}
      />
      <DataFreshness updatedAt={data.updatedAt} source={data.dataSource} />
      <FilterBar filters={filters} options={options} />
      <KpiGrid values={data.kpis} />
      <section className="grid-2">
        <article className="card panel">
          <h2 className="panel-title">Real frente a presupuesto</h2>
          <Bars data={data.monthly} />
        </article>
        <article className="card panel">
          <h2 className="panel-title">Gasto por centro de costo</h2>
          <Bars data={data.byCostCenter} orange />
        </article>
      </section>
      <article className="card panel">
        <h2 className="panel-title">Estado de resultados resumido</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Real</th>
                <th>Presupuesto</th>
                <th>Variación</th>
              </tr>
            </thead>
            <tbody>
              {data.statement.map((row) => (
                <tr key={row.concept}>
                  <td>{row.concept}</td>
                  <td>{formatMoney(row.real)}</td>
                  <td>{formatMoney(row.budget)}</td>
                  <td>
                    {row.budget === 0
                      ? "—"
                      : `${(((row.real - row.budget) / row.budget) * 100).toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
