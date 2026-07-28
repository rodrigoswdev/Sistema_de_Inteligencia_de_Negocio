import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/ui";

export default async function ProfilePage() {
  const user = await getSession();
  return <><PageHeader title="Mi perfil" subtitle="Información de la cuenta activa" /><article className="card panel" style={{ maxWidth: 620 }}><h2 className="panel-title">{user?.name}</h2><p><strong>Correo:</strong> {user?.email}</p><p><strong>Roles:</strong> {user?.roles.join(", ")}</p><p className="page-subtitle">La contraseña y autenticación productiva se gestionan mediante Supabase Auth.</p></article></>;
}
