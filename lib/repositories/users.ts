import type { EstadoGeneral } from "@prisma/client";
import { demoUsers } from "@/lib/data/demo";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
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

const isAppRole = (value: string): value is AppRole =>
  allowedRoles.includes(value as AppRole);

export async function findDemoUser(email: string) {
  return demoUsers.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase(),
  );
}

export async function listUsers() {
  if (isDemoMode()) {
    return demoUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      active: user.active,
    }));
  }
  const rows = await prisma.usuario.findMany({
    orderBy: { nombre: "asc" },
    include: { roles: { include: { rol: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    authUserId: row.authUserId,
    name: row.nombre,
    email: row.email,
    roles: row.roles
      .map((assignment) => assignment.rol.nombre)
      .filter(isAppRole),
    active: row.estado === "ACTIVO",
    lastAccess: row.ultimoAcceso?.toISOString() ?? null,
    createdAt: row.creadoEn.toISOString(),
  }));
}

export async function listRoles() {
  if (isDemoMode()) {
    return allowedRoles.map((name, index) => ({
      id: index + 1,
      name,
      description: name.replaceAll("_", " "),
    }));
  }
  const rows = await prisma.rol.findMany({ orderBy: { nombre: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    name: row.nombre,
    description: row.descripcion,
  }));
}

async function assignRoles(userId: string, roles: AppRole[]) {
  const roleRows = await prisma.rol.findMany({
    where: { nombre: { in: roles } },
    select: { id: true, nombre: true },
  });
  if (roleRows.length !== roles.length) {
    throw new Error("Uno o más roles no existen en la base de datos.");
  }
  await prisma.$transaction([
    prisma.usuarioRol.deleteMany({ where: { usuarioId: userId } }),
    prisma.usuarioRol.createMany({
      data: roleRows.map((role) => ({
        usuarioId: userId,
        rolId: role.id,
      })),
    }),
  ]);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  roles: AppRole[];
}) {
  if (isDemoMode()) {
    return {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      roles: input.roles,
      active: true,
    };
  }
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      "Configure SUPABASE_SERVICE_ROLE_KEY para crear usuarios de Auth.",
    );
  }

  const admin = createSupabaseAdminClient();
  const auth = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });
  if (auth.error || !auth.data.user) {
    throw new Error(auth.error?.message ?? "Supabase no creó el usuario.");
  }

  try {
    const profile = await prisma.usuario.upsert({
      where: { authUserId: auth.data.user.id },
      update: {
        nombre: input.name,
        email: input.email,
        estado: "ACTIVO",
      },
      create: {
        authUserId: auth.data.user.id,
        nombre: input.name,
        email: input.email,
        estado: "ACTIVO",
      },
    });
    await assignRoles(profile.id, input.roles);
    return {
      id: profile.id,
      authUserId: auth.data.user.id,
      name: profile.nombre,
      email: profile.email,
      roles: input.roles,
      active: true,
    };
  } catch (error) {
    await admin.auth.admin.deleteUser(auth.data.user.id).catch(() => undefined);
    throw error;
  }
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    state?: EstadoGeneral;
    roles?: AppRole[];
  },
) {
  if (isDemoMode()) {
    const current = demoUsers.find((user) => user.id === id);
    if (!current) throw new Error("Usuario no encontrado.");
    return {
      id,
      name: input.name ?? current.name,
      email: current.email,
      roles: input.roles ?? current.roles,
      active: (input.state ?? (current.active ? "ACTIVO" : "INACTIVO")) === "ACTIVO",
    };
  }

  const updated = await prisma.usuario.update({
    where: { id },
    data: {
      nombre: input.name,
      estado: input.state,
    },
  });
  if (input.roles) await assignRoles(id, input.roles);

  if (updated.authUserId && isSupabaseAdminConfigured() && input.name) {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.updateUserById(updated.authUserId, {
      user_metadata: { name: input.name },
    });
  }
  return {
    id: updated.id,
    name: updated.nombre,
    email: updated.email,
    roles: input.roles,
    active: updated.estado === "ACTIVO",
  };
}
