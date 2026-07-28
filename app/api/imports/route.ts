import { createHash } from "node:crypto";
import { fail, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { parseCsv } from "@/lib/imports/parser";
import { validateImport } from "@/lib/imports/validation";
import {
  listLoads,
  registerAndProcessImport,
} from "@/lib/repositories/imports";
import { writeAudit } from "@/lib/repositories/audit";
import { recalculateAfterLoad } from "@/lib/services/recalculation";
import { importSchema } from "@/lib/validators/imports";

async function canManageLoads() {
  const user = await getSession();
  return user?.roles.some((role) =>
    ["ADMINISTRADOR", "ANALISTA_BI"].includes(role),
  )
    ? user
    : null;
}

export async function GET() {
  if (!(await canManageLoads())) return fail("Permiso denegado", 403);
  try {
    return ok(await listLoads());
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo consultar el historial",
      503,
    );
  }
}

export async function POST(request: Request) {
  const actor = await canManageLoads();
  if (!actor) return fail("Permiso denegado", 403);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return fail("La carga debe enviarse como formulario", 415);
  }
  const form = await request.formData();
  const file = form.get("file");
  const parsed = importSchema.safeParse({
    module: form.get("module"),
    period: form.get("period"),
    sourceId: form.get("sourceId") || undefined,
  });
  if (!(file instanceof File)) return fail("Seleccione un archivo", 400);
  if (!parsed.success) {
    return fail(
      "Datos de carga inválidos",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }
  if (file.size === 0) return fail("El archivo está vacío", 400);
  if (file.size > 10 * 1024 * 1024) {
    return fail("El archivo supera el límite de 10 MB", 413);
  }
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "xlsx") {
    return fail(
      "El lector XLSX no pudo instalarse por falta de conexión. Guarde temporalmente el archivo como CSV UTF-8.",
      503,
    );
  }
  if (extension !== "csv") return fail("Formato no permitido", 415);

  try {
    const buffer = await file.arrayBuffer();
    const rows = parseCsv(buffer);
    const validation = validateImport(
      parsed.data.module,
      rows,
      parsed.data.period,
    );
    const load = await registerAndProcessImport({
      authUserId: actor.id,
      fileName: file.name,
      period: parsed.data.period,
      sourceId: parsed.data.sourceId,
      checksum: createHash("sha256").update(Buffer.from(buffer)).digest("hex"),
      validation,
    });
    await writeAudit({
      authUserId: actor.id,
      action:
        load.status === "COMPLETADA" ? "PROCESAR_CARGA" : "VALIDAR_CARGA",
      entity: "carga_dato",
      entityId: load.id,
      result: load.status === "COMPLETADA" ? "EXITO" : "ERROR",
      detail: {
        module: load.module,
        total: load.total,
        errors: load.errors,
      },
    });
    if (load.status === "COMPLETADA") {
      const recalculation = await recalculateAfterLoad().catch((error) => ({
        error: error instanceof Error ? error.message : "error desconocido",
      }));
      await writeAudit({
        authUserId: actor.id,
        action: "RECALCULAR_KPI",
        entity: "carga_dato",
        entityId: load.id,
        result: "EXITO",
        detail: recalculation,
      });
    }
    return ok(
      load,
      load.status === "COMPLETADA"
        ? "Carga validada y consolidada"
        : "Carga registrada con errores de validación",
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudo procesar la carga",
      503,
    );
  }
}
