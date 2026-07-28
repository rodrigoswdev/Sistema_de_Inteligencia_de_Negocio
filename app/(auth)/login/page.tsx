import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand"><span className="brand-mark"><BarChart3 size={21} /></span> SIBI CBN</div>
        <h1>Decisiones claras, respaldadas por datos.</h1>
        <p>Ventas, finanzas y desempeño organizacional integrados en una sola plataforma ejecutiva, segura y auditable.</p>
      </section>
      <section className="login-form-side">
        <div className="login-card">
          <p className="kpi-label">Bienvenido</p>
          <h2>Iniciar sesión</h2>
          <p className="page-subtitle">Ingrese con sus credenciales corporativas.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
