import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { formatDateTime } from "@/lib/format";
import { listAudit } from "@/lib/repositories/audit";
import { getSession } from "@/lib/auth/session";
import { BackupManager } from "@/components/audit/backup-manager";

export default async function AuditPage() {
  const user = await getSession();
  let events: Awaited<ReturnType<typeof listAudit>> = [];
  try {
    events = await listAudit(200);
  } catch {
    events = [];
  }
  return (
    <>
      <PageHeader
        title="Auditoría y trazabilidad"
        subtitle="RF-23 · Accesos, cargas, configuración y exportaciones"
        action={<span className="badge"><ClipboardList size={14} /> Solo lectura</span>}
      />
      {user?.roles.includes("ADMINISTRADOR") ? <BackupManager /> : null}
      <article className="card panel">
        <h2 className="panel-title">Bitácora del sistema</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Resultado</th></tr></thead>
            <tbody>{events.length === 0 ? <tr><td colSpan={5}>No existen eventos disponibles.</td></tr> : events.map((event) => <tr key={event.id}><td>{formatDateTime(event.date)}</td><td>{event.user}</td><td>{event.action}</td><td>{event.entity}</td><td>{event.result}</td></tr>)}</tbody>
          </table>
        </div>
      </article>
    </>
  );
}
