"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import type { ReportView } from "@/lib/repositories/reports";

function downloadUrl(report: ReportView) {
  const params = new URLSearchParams({
    module: report.module,
    ...Object.fromEntries(
      Object.entries(report.filters).filter(([, value]) => Boolean(value)),
    ),
  });
  const format = report.format === "PDF" ? "pdf" : "excel";
  return `/api/reports/export/${format}?${params.toString()}`;
}

export function ReportManager({
  initialReports,
  canSchedule,
}: {
  initialReports: ReportView[];
  canSchedule: boolean;
}) {
  const [reports, setReports] = useState(initialReports);
  const [message, setMessage] = useState("");

  async function reload() {
    const response = await fetch("/api/reports", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setReports(result.data);
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      name: form.get("name"),
      module: form.get("module"),
      format: form.get("format"),
      filters: {
        from: form.get("from") || undefined,
        to: form.get("to") || undefined,
        region: form.get("region") || undefined,
      },
    };
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) {
      formElement.reset();
      await reload();
    }
  }

  async function schedule(reportId: string) {
    const recipients = window.prompt(
      "Correos destinatarios separados por coma",
    );
    if (!recipients) return;
    const response = await fetch("/api/reports/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reportId,
        frequency: "MENSUAL",
        recipients,
      }),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) await reload();
  }

  const scheduled = reports.reduce(
    (total, report) => total + report.schedules.length,
    0,
  );

  return (
    <>
      <form className="card filters" onSubmit={create}>
        <label className="field">Nombre<input name="name" required /></label>
        <label className="field">Módulo<select name="module"><option>EJECUTIVO</option><option>VENTAS</option><option>FINANZAS</option><option>DESEMPENO</option></select></label>
        <label className="field">Formato<select name="format"><option>PDF</option><option>EXCEL</option></select></label>
        <label className="field">Desde<input name="from" type="date" /></label>
        <label className="field">Hasta<input name="to" type="date" /></label>
        <label className="field">Región<input name="region" placeholder="Opcional" /></label>
        <button className="button orange">Guardar reporte</button>
      </form>
      {message ? <div className="demo-note">{message}</div> : null}
      <section className="kpi-grid">
        <article className="card kpi"><div className="kpi-label">Reportes configurados</div><div className="kpi-value">{reports.length}</div><div className="kpi-helper">PDF y Excel filtrados</div></article>
        <article className="card kpi"><div className="kpi-label">Programaciones</div><div className="kpi-value">{scheduled}</div><div className="kpi-helper">Entregas registradas</div></article>
      </section>
      <article className="card panel">
        <h2 className="panel-title">Historial y configuración</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reporte</th><th>Módulo</th><th>Formato</th><th>Creación</th><th>Programación</th><th>Acciones</th></tr></thead>
            <tbody>{reports.map((report) => <tr key={report.id}><td>{report.format === "PDF" ? <FileText size={15} style={{ display: "inline", marginRight: 7 }} /> : <FileSpreadsheet size={15} style={{ display: "inline", marginRight: 7 }} />}{report.name}</td><td>{report.module}</td><td>{report.format}</td><td>{new Date(report.createdAt).toLocaleDateString("es-BO")}</td><td>{report.schedules.length ? report.schedules.map((item) => `${item.frequency}: ${new Date(item.nextRun).toLocaleDateString("es-BO")}`).join(", ") : "Sin programación"}</td><td><a className="button secondary" href={downloadUrl(report)}><Download size={14} /> Descargar</a>{canSchedule ? <button className="button" onClick={() => void schedule(report.id)}>Programar</button> : null}</td></tr>)}</tbody>
          </table>
        </div>
      </article>
    </>
  );
}
