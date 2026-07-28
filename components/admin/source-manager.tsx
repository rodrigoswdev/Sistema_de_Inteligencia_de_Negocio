"use client";

import { useEffect, useState } from "react";

interface Source {
  id: string;
  name: string;
  type: string;
  module: string;
  frequency?: string | null;
  active: boolean;
}

async function requestSources() {
  const response = await fetch("/api/admin/sources");
  return { response, result: await response.json() };
}

export function SourceManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { response, result } = await requestSources();
    setLoading(false);
    if (!response.ok) return setMessage(result.message);
    setSources(result.data);
  }

  useEffect(() => {
    let active = true;
    void requestSources().then(({ response, result }) => {
      if (!active) return;
      setLoading(false);
      if (!response.ok) {
        setMessage(result.message);
        return;
      }
      setSources(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        type: form.get("type"),
        module: form.get("module"),
        frequency: form.get("frequency"),
      }),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) {
      event.currentTarget.reset();
      await load();
    }
  }

  async function toggle(source: Source) {
    const response = await fetch(`/api/admin/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !source.active }),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) await load();
  }

  return (
    <>
      <section className="card panel" style={{ marginBottom: 18 }}>
        <h2 className="panel-title">Registrar fuente de datos</h2>
        <form className="filters" style={{ padding: 0, margin: 0 }} onSubmit={create}>
          <label className="field">Nombre<input name="name" required /></label>
          <label className="field">Tipo<select name="type"><option>CSV</option><option>EXCEL</option><option>API</option><option>BD</option></select></label>
          <label className="field">Módulo<select name="module"><option>VENTAS</option><option>FINANZAS</option><option>DESEMPENO</option></select></label>
          <label className="field">Frecuencia<select name="frequency"><option>MENSUAL</option><option>SEMANAL</option><option>TRIMESTRAL</option><option>BAJO_DEMANDA</option></select></label>
          <button className="button" style={{ alignSelf: "end" }}>Guardar fuente</button>
        </form>
        {message && <div className="demo-note">{message}</div>}
      </section>
      <article className="card panel">
        <h2 className="panel-title">Catálogo de fuentes</h2>
        {loading ? <p>Cargando...</p> : (
          <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Módulo</th><th>Frecuencia</th><th>Estado</th><th></th></tr></thead><tbody>
            {sources.map((source) => <tr key={source.id}><td>{source.name}</td><td>{source.type}</td><td>{source.module}</td><td>{source.frequency ?? "—"}</td><td>{source.active ? "ACTIVA" : "INACTIVA"}</td><td><button className="button secondary" onClick={() => toggle(source)}>{source.active ? "Desactivar" : "Activar"}</button></td></tr>)}
          </tbody></table></div>
        )}
      </article>
    </>
  );
}
