import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { ReportManager } from "@/components/reports/report-manager";
import { getSession } from "@/lib/auth/session";
import { listReports } from "@/lib/repositories/reports";

export default async function ReportsPage() {
  const user = await getSession();
  let reports: Awaited<ReturnType<typeof listReports>> = [];
  try {
    reports = await listReports();
  } catch {
    reports = [];
  }
  const canSchedule =
    user?.roles.some((role) =>
      ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
    ) ?? false;
  return (
    <>
      <PageHeader
        title="Reportes y exportaciones"
        subtitle="Generación, descarga y programación de entregables"
        action={
          <span className="badge">
            <Plus size={14} /> RF-19 a RF-21
          </span>
        }
      />
      <ReportManager initialReports={reports} canSchedule={canSchedule} />
    </>
  );
}
