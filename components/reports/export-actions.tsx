import { FileSpreadsheet, FileText } from "lucide-react";
import type { AnalyticsFilters } from "@/lib/types";
import type { ReportModule } from "@/lib/services/report-data";

function exportUrl(
  format: "pdf" | "excel",
  module: ReportModule,
  filters: AnalyticsFilters,
) {
  const params = new URLSearchParams({ module });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/api/reports/export/${format}?${params.toString()}`;
}

export function ExportActions({
  module,
  filters,
}: {
  module: ReportModule;
  filters: AnalyticsFilters;
}) {
  return (
    <div className="export-actions">
      <a
        className="button secondary"
        href={exportUrl("pdf", module, filters)}
      >
        <FileText size={15} /> PDF
      </a>
      <a
        className="button secondary"
        href={exportUrl("excel", module, filters)}
      >
        <FileSpreadsheet size={15} /> Excel
      </a>
    </div>
  );
}
