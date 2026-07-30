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
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await requestAdministration();
      if (!data.usersResponse.ok) {
        setMessageType("error");
        setMessage(data.usersResult.message);
        return;
      }
      setUsers(data.usersResult.data);
      if (data.rolesResponse.ok) setRoles(data.rolesResult.data);
      if (data.auditResponse.ok) setAudit(data.auditResult.data);
    } catch {
      setMessageType("error");
      setMessage("No se pudo actualizar la información. Verifique la conexión.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void requestAdministration()
      .then((data) => {
        if (!active) return;
        if (!data.usersResponse.ok) {
          setMessageType("error");
          setMessage(data.usersResult.message);
          return;
        }
        setUsers(data.usersResult.data);
        if (data.rolesResponse.ok) setRoles(data.rolesResult.data);
        if (data.auditResponse.ok) setAudit(data.auditResult.data);
      })
      .catch(() => {
        if (!active) return;
        setMessageType("error");
        setMessage("No se pudo cargar la administración de usuarios.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setCreating(true);
    setMessage("");

    try {
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
      setMessageType(response.ok ? "success" : "error");
      setMessage(result.message);
      if (response.ok) {
        formElement.reset();
        await load();
      }
    } catch {
      setMessageType("error");
      setMessage("No se pudo crear el usuario. Verifique la conexión.");
    } finally {
      setCreating(false);
    }
  }

  async function toggle(user: UserRow) {
    setUpdatingUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: user.active ? "INACTIVO" : "ACTIVO",
        }),
      });
      const result = await response.json();
      setMessageType(response.ok ? "success" : "error");
      setMessage(result.message);
      if (response.ok) await load();
    } catch {
      setMessageType("error");
      setMessage("No se pudo actualizar el estado del usuario.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <>
      <section className="card user-create-card">
        <div className="user-section-head">
          <div>
            <span className="section-eyebrow">Administración de accesos</span>
            <h2 className="panel-title">Crear usuario y asignar rol</h2>
            <p>
              Registre la cuenta, defina sus permisos y entregue una contraseña
              temporal.
            </p>
          </div>
          <span className="badge">{roles.length} roles disponibles</span>
        </div>

        <form className="user-form" onSubmit={create}>
          <label className="field">
            Nombre completo
            <input
              name="name"
              autoComplete="name"
              placeholder="Ej. María Pérez"
              required
            />
          </label>
          <label className="field">
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@empresa.com"
              required
            />
          </label>
          <label className="field">
            Contraseña temporal
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              required
            />
          </label>
          <label className="field">
            Rol de acceso
            <select name="role" required disabled={roles.length === 0}>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button user-create-button"
            disabled={creating || roles.length === 0}
          >
            {creating ? "Creando usuario..." : "Crear usuario"}
          </button>
        </form>

        <p className="form-helper">
          La contraseña debe tener entre 8 y 72 caracteres.
        </p>
        {message && (
          <div className={`admin-message ${messageType}`} role="status">
            {message}
          </div>
        )}
      </section>

      <article className="card panel user-table-card">
        <div className="user-section-head">
          <div>
            <span className="section-eyebrow">Control de cuentas</span>
            <h2 className="panel-title">Usuarios y roles</h2>
          </div>
          <span className="user-count">{users.length} usuarios</span>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Roles</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Todavía no existen usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className="role-badge">
                          {user.roles
                            .map((role) => role.replaceAll("_", " "))
                            .join(", ")}
                        </span>
                      </td>
                      <td>
                        {user.lastAccess
                          ? new Date(user.lastAccess).toLocaleString("es-BO")
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            user.active ? "active" : "inactive"
                          }`}
                        >
                          <span />
                          {user.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="button secondary compact"
                          disabled={updatingUserId === user.id}
                          onClick={() => toggle(user)}
                        >
                          {updatingUserId === user.id
                            ? "Actualizando..."
                            : user.active
                              ? "Desactivar"
                              : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="card panel">
        <h2 className="panel-title">Bitácora reciente</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>Resultado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((event) => (
                <tr key={event.id}>
                  <td>{event.user}</td>
                  <td>{event.action}</td>
                  <td>{event.entity}</td>
                  <td>{event.result}</td>
                  <td>{new Date(event.date).toLocaleString("es-BO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
