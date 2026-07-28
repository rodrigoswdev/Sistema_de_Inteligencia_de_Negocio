"use client";

import { Archive, Download, HardDrive, Play, Save } from "lucide-react";
import { useEffect, useState } from "react";

interface BackupConfig {
  frequency: "DIARIA" | "SEMANAL" | "MENSUAL";
  time: string;
  weekDay?: number | null;
  monthDay?: number | null;
  retention: number;
  includeAudit: boolean;
  active: boolean;
}

interface BackupItem {
  id: string;
  type: string;
  status: string;
  file?: string | null;
  sizeBytes?: number | null;
  tables: number;
  startedAt: string;
  error?: string | null;
}

const initialConfig: BackupConfig = {
  frequency: "SEMANAL",
  time: "02:00",
  weekDay: 0,
  monthDay: 1,
  retention: 12,
  includeAudit: true,
  active: true,
};

const weekDays = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function formatBytes(value?: number | null) {
  if (!value) return "—";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupManager() {
  const [config, setConfig] = useState(initialConfig);
  const [history, setHistory] = useState<BackupItem[]>([]);
  const [nextRun, setNextRun] = useState<string>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/backups", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    setConfig(result.data.config);
    setHistory(result.data.history);
    setNextRun(result.data.nextRun);
  }

  useEffect(() => {
    fetch("/api/backups", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setConfig(result.data.config);
        setHistory(result.data.history);
        setNextRun(result.data.nextRun);
      })
      .catch((error) =>
        setMessage(
          `${error instanceof Error ? error.message : "No se pudo cargar"}. Ejecute la migración 202607260002_copias_seguridad.sql.`,
        ),
      );
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/backups", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(config),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) await load();
    setBusy(false);
  }

  async function runNow() {
    setBusy(true);
    setMessage("Creando y comprimiendo la copia...");
    const response = await fetch("/api/backups", { method: "POST" });
    const result = await response.json();
    setMessage(result.message);
    await load().catch(() => undefined);
    setBusy(false);
  }

  return (
    <section className="card panel" style={{ marginBottom: 18 }}>
      <div className="page-head">
        <div>
          <h2 className="panel-title">
            <Archive size={17} style={{ display: "inline", marginRight: 7 }} />
            Copias de seguridad
          </h2>
          <p className="page-subtitle">
            Configuración automática, retención y almacenamiento privado
          </p>
        </div>
        <button className="button orange" disabled={busy} onClick={() => void runNow()}>
          <Play size={15} /> Crear copia ahora
        </button>
      </div>
      <form className="filters" onSubmit={save}>
        <label className="field">
          Frecuencia
          <select
            value={config.frequency}
            onChange={(event) =>
              setConfig({
                ...config,
                frequency: event.target.value as BackupConfig["frequency"],
              })
            }
          >
            <option value="DIARIA">Todos los días</option>
            <option value="SEMANAL">Cada semana</option>
            <option value="MENSUAL">Cada mes</option>
          </select>
        </label>
        <label className="field">
          Hora
          <input
            type="time"
            value={config.time}
            onChange={(event) =>
              setConfig({ ...config, time: event.target.value })
            }
          />
        </label>
        {config.frequency === "SEMANAL" ? (
          <label className="field">
            Día
            <select
              value={config.weekDay ?? 0}
              onChange={(event) =>
                setConfig({ ...config, weekDay: Number(event.target.value) })
              }
            >
              {weekDays.map((day, index) => (
                <option value={index} key={day}>{day}</option>
              ))}
            </select>
          </label>
        ) : null}
        {config.frequency === "MENSUAL" ? (
          <label className="field">
            Día del mes
            <input
              type="number"
              min={1}
              max={28}
              value={config.monthDay ?? 1}
              onChange={(event) =>
                setConfig({ ...config, monthDay: Number(event.target.value) })
              }
            />
          </label>
        ) : null}
        <label className="field">
          Copias a conservar
          <input
            type="number"
            min={1}
            max={100}
            value={config.retention}
            onChange={(event) =>
              setConfig({ ...config, retention: Number(event.target.value) })
            }
          />
        </label>
        <label className="field">
          Estado
          <select
            value={config.active ? "ACTIVO" : "INACTIVO"}
            onChange={(event) =>
              setConfig({ ...config, active: event.target.value === "ACTIVO" })
            }
          >
            <option value="ACTIVO">Automáticas activas</option>
            <option value="INACTIVO">Pausadas</option>
          </select>
        </label>
        <label className="field">
          Contenido
          <select
            value={config.includeAudit ? "TODO" : "SIN_AUDITORIA"}
            onChange={(event) =>
              setConfig({
                ...config,
                includeAudit: event.target.value === "TODO",
              })
            }
          >
            <option value="TODO">Datos y auditoría</option>
            <option value="SIN_AUDITORIA">Datos sin auditoría</option>
          </select>
        </label>
        <button className="button" disabled={busy}>
          <Save size={15} /> Guardar
        </button>
      </form>
      {nextRun ? (
        <div className="demo-note">
          Próxima copia estimada:{" "}
          <strong>{new Date(nextRun).toLocaleString("es-BO")}</strong>
        </div>
      ) : null}
      {message ? <div className="demo-note">{message}</div> : null}
      <h3 className="panel-title" style={{ marginTop: 20 }}>
        <HardDrive size={16} style={{ display: "inline", marginRight: 7 }} />
        Historial
      </h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Archivo</th><th>Tablas</th><th>Tamaño</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>
            {history.length === 0 ? <tr><td colSpan={7}>Todavía no se crearon copias.</td></tr> : history.map((item) => <tr key={item.id}><td>{new Date(item.startedAt).toLocaleString("es-BO")}</td><td>{item.type}</td><td>{item.file ?? item.error ?? "—"}</td><td>{item.tables}</td><td>{formatBytes(item.sizeBytes)}</td><td>{item.status}</td><td>{item.status === "COMPLETADA" ? <a className="button secondary" href={`/api/backups/${item.id}/download`}><Download size={14} /> Descargar</a> : "—"}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
