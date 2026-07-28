"use client";

import { Fragment, useState } from "react";
import { UploadForm } from "@/components/imports/upload-form";
import { formatDateTime } from "@/lib/format";
import type { LoadView } from "@/lib/imports/types";

type Envelope<T> = { data: T; message: string };

function statusColor(status: LoadView["status"]) {
  if (status === "COMPLETADA") return "#16a34a";
  if (status === "CON_ERRORES" || status === "FALLIDA") return "#dc2626";
  return "#d97706";
}

export function LoadManager({ initialLoads }: { initialLoads: LoadView[] }) {
  const [loads, setLoads] = useState<LoadView[]>(initialLoads);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/imports", { cache: "no-store" });
      const result = (await response.json()) as Envelope<LoadView[]>;
      if (!response.ok) throw new Error(result.message);
      setLoads(result.data);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se cargó el historial.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function retry(id: string) {
    setMessage("Reintentando carga...");
    const response = await fetch(`/api/imports/${id}/retry`, {
      method: "POST",
    });
    const result = (await response.json()) as Envelope<LoadView>;
    setMessage(result.message);
    if (response.ok) await refresh();
  }

  return (
    <>
      <section className="card panel" style={{ marginBottom: 18 }}>
        <h2 className="panel-title">Importar archivo</h2>
        <UploadForm onCompleted={refresh} />
        <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 13 }}>
          Use la plantilla del módulo. El archivo completo se consolida únicamente
          cuando todas sus filas superan la validación.
        </p>
      </section>
      <article className="card panel">
        <h2 className="panel-title">Historial de cargas</h2>
        {message && <div className="demo-note">{message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Archivo</th>
                <th>Módulo / periodo</th>
                <th>Válidas</th>
                <th>Errores</th>
                <th>Calidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>Consultando cargas...</td>
                </tr>
              ) : loads.length === 0 ? (
                <tr>
                  <td colSpan={8}>Todavía no existen cargas.</td>
                </tr>
              ) : (
                loads.map((load) => (
                  <Fragment key={load.id}>
                    <tr>
                      <td>{formatDateTime(load.date)}</td>
                      <td>{load.file}</td>
                      <td>
                        {load.module} · {load.period}
                      </td>
                      <td>
                        {load.valid.toLocaleString("es-BO")} /{" "}
                        {load.total.toLocaleString("es-BO")}
                      </td>
                      <td>{load.errors}</td>
                      <td>{load.quality.toFixed(2)}%</td>
                      <td>
                        <span
                          style={{
                            color: statusColor(load.status),
                            fontWeight: 700,
                          }}
                        >
                          {load.status}
                        </span>
                      </td>
                      <td>
                        {load.errorDetails?.length ? (
                          <button
                            className="button"
                            onClick={() =>
                              setExpanded(expanded === load.id ? null : load.id)
                            }
                          >
                            Ver errores
                          </button>
                        ) : null}
                        {["CON_ERRORES", "FALLIDA"].includes(load.status) ? (
                          <button
                            className="button"
                            onClick={() => void retry(load.id)}
                          >
                            Reintentar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {expanded === load.id && load.errorDetails?.length ? (
                    <tr>
                        <td colSpan={8}>
                          <strong>Primeros errores detectados</strong>
                          <ul style={{ margin: "8px 0 0" }}>
                            {load.errorDetails.map((error, index) => (
                              <li key={`${error.row}-${error.field}-${index}`}>
                                {error.row ? `Fila ${error.row}` : "Archivo"}
                                {error.field ? ` · ${error.field}` : ""}:{" "}
                                {error.message}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
