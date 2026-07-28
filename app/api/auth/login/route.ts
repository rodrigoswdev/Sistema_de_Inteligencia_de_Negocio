import { createSession } from "@/lib/auth/session";
import { fail, ok } from "@/lib/api/response";
import { findDemoUser } from "@/lib/repositories/users";
import {
  registerSuccessfulAccess,
  writeAudit,
} from "@/lib/repositories/audit";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/auth";
import type { AppRole } from "@/lib/types";

const allowedRoles: AppRole[] = [
  "ADMINISTRADOR",
  "ANALISTA_BI",
  "VENTAS",
  "FINANZAS",
  "DESEMPENO",
  "GERENCIA",
  "AUDITOR",
];

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail(
      "Datos de acceso inválidos",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }

  const { email, password } = parsed.data;
  if (process.env.DEMO_MODE !== "false" || !isSupabaseConfigured()) {
    const demo = await findDemoUser(email);
    if (!demo || demo.password !== password || !demo.active) {
      return fail("Correo o contraseña incorrectos", 401);
    }
    const user = {
      id: demo.id,
      name: demo.name,
      email: demo.email,
      roles: demo.roles,
    };
    await createSession(user);
    return ok(user, "Sesión iniciada");
  }

  const supabase = await createSupabaseServerClient();
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) {
    await writeAudit({
      action: "INICIO_SESION",
      entity: "usuario",
      result: "ERROR",
      detail: { reason: "credenciales_invalidas" },
    });
    return fail("Correo o contraseña incorrectos", 401);
  }

  const roleResult = await supabase.rpc("mis_roles");
  const databaseRoles = Array.isArray(roleResult.data)
    ? roleResult.data.filter((role): role is AppRole =>
        allowedRoles.includes(role as AppRole),
      )
    : [];

  if (roleResult.error || databaseRoles.length === 0) {
    await supabase.auth.signOut();
    await writeAudit({
      authUserId: result.data.user.id,
      action: "INICIO_SESION",
      entity: "usuario",
      result: "ERROR",
      detail: { reason: "usuario_sin_rol_activo" },
    });
    return fail("El usuario no tiene un rol activo asignado", 403);
  }

  const metadata = result.data.user.user_metadata;
  const user = {
    id: result.data.user.id,
    name: metadata.name ?? email.split("@")[0],
    email,
    roles: databaseRoles,
  };
  await createSession(user);
  await registerSuccessfulAccess(user.id);
  return ok(user, "Sesión iniciada");
}
