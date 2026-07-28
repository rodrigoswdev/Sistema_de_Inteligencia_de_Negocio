import { ROLE_LABELS, ROUTE_ACCESS } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";

const roles = Object.keys(ROLE_LABELS) as AppRole[];
const routes = Object.entries(ROUTE_ACCESS).filter(([route]) => route !== "/perfil");

export function PermissionMatrix() {
  return (
    <section className="card panel" style={{ marginTop: 18 }}>
      <h2 className="panel-title">RF-24 · Matriz efectiva de permisos</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Rol</th><th>Alcance</th><th>Rutas autorizadas</th></tr></thead>
          <tbody>{roles.map((role) => <tr key={role}><td>{role}</td><td>{ROLE_LABELS[role]}</td><td>{routes.filter(([, allowed]) => allowed.includes(role)).map(([route]) => route === "/" ? "Ejecutivo" : route).join(", ")}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
