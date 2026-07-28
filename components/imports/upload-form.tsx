"use client";

import { useState } from "react";
import type { LoadView } from "@/lib/imports/types";
import type { ImportModule } from "@/lib/validators/imports";

type Envelope<T> = { data: T; message: string };

function currentPeriod() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function UploadForm({ onCompleted }: { onCompleted?: () => void }) {
  const [module, setModule] = useState<ImportModule>("VENTAS");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as Envelope<LoadView>;
      setMessage(
        response.ok && result.data
          ? `${result.message}: ${result.data.valid}/${result.data.total} filas válidas`
          : result.message,
      );
      if (response.ok) {
        event.currentTarget.reset();
        setModule("VENTAS");
        onCompleted?.();
      }
    } catch {
      setMessage("No fue posible comunicarse con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="filters"
      style={{ padding: 0, margin: 0 }}
    >
      <label className="field">
        Módulo
        <select
          name="module"
          value={module}
          onChange={(event) => setModule(event.target.value as ImportModule)}
        >
          <option>VENTAS</option>
          <option>FINANZAS</option>
          <option>DESEMPENO</option>
        </select>
      </label>
      <label className="field">
        Periodo
        <input name="period" type="month" defaultValue={currentPeriod()} required />
      </label>
      <label className="field" style={{ flex: 1 }}>
        Archivo CSV UTF-8
        <input name="file" type="file" accept=".csv,.xlsx" required />
      </label>
      <button
        className="button orange"
        disabled={loading}
        style={{ alignSelf: "end" }}
      >
        {loading ? "Procesando..." : "Validar y consolidar"}
      </button>
      <a
        className="button"
        href={`/api/imports/template?module=${module}`}
        style={{ alignSelf: "end" }}
      >
        Descargar plantilla
      </a>
      {message && (
        <div className="demo-note" style={{ flexBasis: "100%", margin: 0 }}>
          {message}
        </div>
      )}
    </form>
  );
}
