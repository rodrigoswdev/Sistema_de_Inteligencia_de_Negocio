"use client";

import { useEffect, useState } from "react";

interface KpiView {
  id: string;
  code: string;
  name: string;
  module: string;
  formula: string;
  unit: string;
  direction: string;
  frequency: string;
  target?: number | null;
  active: boolean;
}

export function KpiManager() {
  const [kpis, setKpis] = useState<KpiView[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/kpis", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setKpis(result.data);
  }

  useEffect(() => {
    fetch("/api/kpis", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setKpis(result.data ?? []))
      .catch(() => setMessage("No se pudo consultar el catálogo KPI."));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const green = Number(form.get("green"));
    const yellow = Number(form.get("yellow"));
    const body = {
      code: form.get("code"),
      name: form.get("name"),
      module: form.get("module"),
      formula: form.get("formula"),
      unit: form.get("unit"),
      direction: form.get("direction"),
      frequency: form.get("frequency"),
      target: Number(form.get("target")),
      thresholds: [
        { level: "VERDE", from: green, color: "bg-green-500" },
        { level: "AMARILLO", from: yellow, to: green, color: "bg-amber-500" },
        { level: "ROJO", to: yellow, color: "bg-red-500" },
      ],
    };
    const response = await fetch("/api/kpis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) {
      event.currentTarget.reset();
      await load();
    }
  }

  async function toggle(kpi: KpiView) {
    const response = await fetch(`/api/kpis/${kpi.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !kpi.active }),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) await load();
  }

  return (
    <section className="card panel" style={{ marginTop: 18 }}>
      <h2 className="panel-title">RF-16 · Configuración de KPI y umbrales</h2>
      <form className="filters" onSubmit={submit}>
        <label className="field">Código<input name="code" required placeholder="VEN-10" /></label>
        <label className="field">Nombre<input name="name" required /></label>
        <label className="field">Módulo<select name="module"><option>VENTAS</option><option>FINANZAS</option><option>DESEMPENO</option></select></label>
        <label className="field">Unidad<input name="unit" required defaultValue="%" /></label>
        <label className="field">Periodicidad<select name="frequency"><option>MENSUAL</option><option>SEMANAL</option><option>TRIMESTRAL</option><option>ANUAL</option></select></label>
        <label className="field">Sentido<select name="direction"><option>MAYOR_MEJOR</option><option>MENOR_MEJOR</option><option>RANGO</option><option>INFORMATIVO</option></select></label>
        <label className="field">Meta<input name="target" type="number" step="any" required /></label>
        <label className="field">Desde amarillo<input name="yellow" type="number" step="any" defaultValue="90" required /></label>
        <label className="field">Desde verde<input name="green" type="number" step="any" defaultValue="100" required /></label>
        <label className="field" style={{ flexBasis: "100%" }}>Fórmula<input name="formula" required placeholder="venta_neta / meta * 100" /></label>
        <button className="button orange">Crear KPI</button>
      </form>
      {message ? <div className="demo-note">{message}</div> : null}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>KPI</th><th>Módulo</th><th>Meta</th><th>Periodicidad</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>{kpis.map((kpi) => <tr key={kpi.id}><td>{kpi.code}</td><td>{kpi.name}</td><td>{kpi.module}</td><td>{kpi.target ?? "—"} {kpi.unit}</td><td>{kpi.frequency}</td><td>{kpi.active ? "ACTIVO" : "INACTIVO"}</td><td><button className="button" onClick={() => void toggle(kpi)}>{kpi.active ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
