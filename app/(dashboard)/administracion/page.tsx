import { ShieldCheck } from "lucide-react";
import { UserManager } from "@/components/admin/user-manager";
import { KpiManager } from "@/components/admin/kpi-manager";
import { PageHeader } from "@/components/dashboard/ui";
import { PermissionMatrix } from "@/components/admin/permission-matrix";

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="RF-02 y RF-23 · Usuarios, roles, estados y trazabilidad"
        action={<span className="badge"><ShieldCheck size={14} /> Acceso restringido</span>}
      />
      <UserManager />
      <KpiManager />
      <PermissionMatrix />
    </>
  );
}
