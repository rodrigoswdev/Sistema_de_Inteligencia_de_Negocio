"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  lastAccess?: string | null;
}

interface RoleRow {
  id: number;
  name: string;
  description?: string | null;
}

interface AuditRow {
  id: string | number;
  user: string;
  action: string;
  entity: string;
  result: string;
  date: string;
}

async function requestAdministration() {
  const [usersResponse, rolesResponse, auditResponse] = await Promise.all([
    fetch("/api/admin/users"),
    fetch("/api/admin/roles"),
    fetch("/api/audit-log"),
  ]);
  const [usersResult, rolesResult, auditResult] = await Promise.all([
    usersResponse.json(),
    rolesResponse.json(),
    auditResponse.json(),
  ]);
  return {
    usersResponse,
    rolesResponse,
    auditResponse,
    usersResult,
    rolesResult,
    auditResult,
  };
}

export function UserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const {
      usersResponse,
      rolesResponse,
      auditResponse,
      usersResult,
      rolesResult,
      auditResult,
    } = await requestAdministration();
    setLoading(false);
    if (!usersResponse.ok) return setMessage(usersResult.message);
    setUsers(usersResult.data);
    if (rolesResponse.ok) setRoles(rolesResult.data);
    if (auditResponse.ok) setAudit(auditResult.data);
  }

  useEffect(() => {
    let active = true;
    void requestAdministration().then((data) => {
      if (!active) return;
      setLoading(false);
      if (!data.usersResponse.ok) {
        setMessage(data.usersResult.message);
        return;
      }
      setUsers(data.usersResult.data);
      if (data.rolesResponse.ok) setRoles(data.rolesResult.data);
      if (data.auditResponse.ok) setAudit(data.auditResult.data);
    });
    return () => {
      active = false;
    };
  }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        roles: [form.get("role")],
      }),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) {
      event.currentTarget.reset();
      await load();
    }
  }

  async function toggle(user: UserRow) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: user.active ? "INACTIVO" : "ACTIVO" }),
    });
    const result = await response.json();
    setMessage(result.message);
    if (response.ok) await load();
  }

  return (
    <>
      <section className="card panel" style={{ marginBottom: 18 }}>
        <h2 className="panel-title">Crear usuario y asignar rol</h2>
        <form className="filters" style={{ padding: 0, margin: 0 }} onSubmit={create}>
          <label className="field">Nombre<input name="name" required /></label>
          <label className="field">Correo<input name="email" type="email" required /></label>
          <label className="field">Contraseña temporal<input name="password" type="password" minLength={8} required /></label>
          <label className="field">Rol<select name="role" required>{roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}</select></label>
          <button className="button" style={{ alignSelf: "end" }}>Crear usuario</button>
        </form>
        {message && <div className="demo-note">{message}</div>}
      </section>
      <article className="card panel" style={{ marginBottom: 18 }}>
        <h2 className="panel-title">Usuarios y roles</h2>
        {loading ? <p>Cargando...</p> : (
          <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Roles</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead><tbody>
            {users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.roles.join(", ")}</td><td>{user.lastAccess ? new Date(user.lastAccess).toLocaleString("es-BO") : "—"}</td><td>{user.active ? "ACTIVO" : "INACTIVO"}</td><td><button className="button secondary" onClick={() => toggle(user)}>{user.active ? "Desactivar" : "Activar"}</button></td></tr>)}
          </tbody></table></div>
        )}
      </article>
      <article className="card panel">
        <h2 className="panel-title">Bitácora reciente</h2>
        <div className="table-wrap"><table><thead><tr><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Resultado</th><th>Fecha</th></tr></thead><tbody>
          {audit.map((event) => <tr key={event.id}><td>{event.user}</td><td>{event.action}</td><td>{event.entity}</td><td>{event.result}</td><td>{new Date(event.date).toLocaleString("es-BO")}</td></tr>)}
        </tbody></table></div>
      </article>
    </>
  );
}
