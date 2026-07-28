import { Upload } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { LoadManager } from "@/components/imports/load-manager";
import { listLoads } from "@/lib/repositories/imports";
import type { LoadView } from "@/lib/imports/types";

export default async function LoadsPage() {
  let initialLoads: LoadView[] = [];
  try {
    initialLoads = await listLoads();
  } catch {
    initialLoads = [];
  }
  return (
    <>
      <PageHeader
        title="Carga e integración de datos"
        subtitle="Importación controlada con validación, trazabilidad y reintentos"
        action={
          <span className="button">
            <Upload size={16} /> RF-04 a RF-09
          </span>
        }
      />
      <LoadManager initialLoads={initialLoads} />
    </>
  );
}
