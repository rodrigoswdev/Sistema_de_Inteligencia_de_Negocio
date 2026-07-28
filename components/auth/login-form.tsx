"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.message ?? "No fue posible iniciar sesión");
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <label className="field">Correo electrónico<input name="email" type="email" defaultValue="admin@cbn.local" required /></label>
      <label className="field">Contraseña<input name="password" type="password" defaultValue="Password123" required /></label>
      {error && <div className="login-error">{error}</div>}
      <button className="button" disabled={loading}>{loading ? "Verificando..." : "Ingresar al sistema"}</button>
      <div className="demo-note"><strong>Acceso de demostración</strong><br />admin@cbn.local / Password123<br />Los datos mostrados están identificados como simulados.</div>
    </form>
  );
}
