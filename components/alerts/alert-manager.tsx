"use client";

import { useState } from "react";

interface AlertView {
  id: string;
  severity: string;
  message: string;
  module: string;
  status: "ABIERTA" | "ATENDIDA" | "CERRADA";
  period: string;
}

const color: Record<string, string> = {
  CRITICA: "ROJO",
  ALTA: "ROJO",
  MEDIA: "AMARILLO",
  BAJA: "VERDE",
};

export function AlertManager({
  initialAlerts,
  canManage,
}: {
  initialAlerts: AlertView[];
  canManage: boolean;
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [message, setMessage] = useState("");

  async function reload() {
    const response = await fetch("/api/alerts", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setAlerts(result.data);
  }

  async function update(id: string, status: "ATENDIDA" | "CERRADA") {
    const comment = window.prompt("Comentario de seguimiento (opcional)") ?? "";
    const response = await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, comment }),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) await reload();
  }

  async function generate() {
    const response = await fetch("/api/alerts/generate", { method: "POST" });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) await reload();
  }

  return (
    <article className="card panel">
      <div className="page-head">
        <h2 className="panel-title">Bandeja de alertas</h2>
        {canManage ? (
          <button className="button secondary" onClick={() => void generate()}>
            Evaluar indicadores
          </button>
        ) : null}
      </div>
      {message ? <div className="demo-note">{message}</div> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Severidad</th>
              <th>Descripción</th>
              <th>Módulo</th>
              <th>Periodo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>
                  <span className="badge">
                    <span className={`dot ${color[alert.severity]}`} />
                    {alert.severity}
                  </span>
                </td>
                <td>{alert.message}</td>
                <td>{alert.module}</td>
                <td>{alert.period}</td>
                <td>{alert.status}</td>
                <td>
                  {canManage && alert.status === "ABIERTA" ? (
                    <button
                      className="button secondary"
                      onClick={() => void update(alert.id, "ATENDIDA")}
                    >
                      Atender
                    </button>
                  ) : null}
                  {canManage && alert.status === "ATENDIDA" ? (
                    <button
                      className="button"
                      onClick={() => void update(alert.id, "CERRADA")}
                    >
                      Cerrar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
