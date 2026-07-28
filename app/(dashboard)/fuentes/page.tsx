import { Database } from "lucide-react";
import { SourceManager } from "@/components/admin/source-manager";
import { PageHeader } from "@/components/dashboard/ui";

export default function SourcesPage() {
  return (
    <>
      <PageHeader
        title="Fuentes de datos"
        subtitle="RF-03 · Registro y configuración de orígenes para ventas, finanzas y desempeño"
        action={<span className="badge"><Database size={14} /> Catálogo controlado</span>}
      />
      <SourceManager />
    </>
  );
}
