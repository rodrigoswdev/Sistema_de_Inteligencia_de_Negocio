import { BellRing } from "lucide-react";
import { AlertManager } from "@/components/alerts/alert-manager";
import { PageHeader } from "@/components/dashboard/ui";
import { getSession } from "@/lib/auth/session";
import { listAlerts } from "@/lib/repositories/alerts";

export default async function AlertsPage() {
  const user = await getSession();
  let alerts: Awaited<ReturnType<typeof listAlerts>> = [];
  try {
    alerts = await listAlerts();
  } catch {
    alerts = [];
  }
  const canManage =
    user?.roles.some((role) =>
      ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
    ) ?? false;
  return (
    <>
      <PageHeader
        title="Alertas"
        subtitle="Eventos de negocio que requieren seguimiento"
        action={
          <span className="badge">
            <BellRing size={14} /> RF-17 y RF-18
          </span>
        }
      />
      <AlertManager initialAlerts={alerts} canManage={canManage} />
    </>
  );
}
