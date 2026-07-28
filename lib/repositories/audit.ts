import { auditEvents } from "@/lib/data/demo";
import type { Prisma } from "@prisma/client";
import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";

interface AuditInput {
  authUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  result: "EXITO" | "ERROR";
  detail?: Record<string, unknown>;
}

export async function writeAudit(input: AuditInput) {
  if (isDemoMode()) return;
  try {
    const profile = input.authUserId
      ? await prisma.usuario.findUnique({
          where: { authUserId: input.authUserId },
          select: { id: true },
        })
      : null;
    await prisma.bitacora.create({
      data: {
        usuarioId: profile?.id,
        accion: input.action,
        entidad: input.entity,
        entidadId: input.entityId,
        resultado: input.result,
        detalleJson: input.detail as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error(
      "No se pudo registrar la bitácora:",
      error instanceof Error ? error.message : "error desconocido",
    );
  }
}

export async function registerSuccessfulAccess(authUserId: string) {
  if (isDemoMode()) return;
  try {
    const profile = await prisma.usuario.findUnique({
      where: { authUserId },
      select: { id: true },
    });
    if (!profile) return;
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: profile.id },
        data: { ultimoAcceso: new Date() },
      }),
      prisma.bitacora.create({
        data: {
          usuarioId: profile.id,
          accion: "INICIO_SESION",
          entidad: "usuario",
          entidadId: profile.id,
          resultado: "EXITO",
        },
      }),
    ]);
  } catch (error) {
    console.error(
      "No se pudo actualizar el último acceso:",
      error instanceof Error ? error.message : "error desconocido",
    );
  }
}

export async function listAudit(limit = 50) {
  if (isDemoMode()) return auditEvents;
  const rows = await prisma.bitacora.findMany({
    take: Math.min(Math.max(limit, 1), 200),
    orderBy: { fecha: "desc" },
    include: { usuario: { select: { nombre: true } } },
  });
  return rows.map((row) => ({
    id: row.id.toString(),
    user: row.usuario?.nombre ?? "Sistema",
    action: row.accion,
    entity: row.entidad,
    result: row.resultado,
    date: row.fecha.toISOString(),
  }));
}
