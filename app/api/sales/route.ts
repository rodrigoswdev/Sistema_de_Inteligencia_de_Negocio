import { createHash } from "node:crypto";
import { fail, ok } from "@/lib/api/response";
import { canRegisterSales } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { validateImport } from "@/lib/imports/validation";
import { writeAudit } from "@/lib/repositories/audit";
import { registerAndProcessImport } from "@/lib/repositories/imports";
import { recalculateAfterLoad } from "@/lib/services/recalculation";
import { manualSaleSchema } from "@/lib/validators/sales";

export async function POST(request: Request) {
  const actor = await getSession();
  if (!actor || !canRegisterSales(actor)) {
    return fail("No tiene permiso para registrar ventas.", 403);
  }

  const parsed = manualSaleSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail(
      "Revise los datos de la venta.",
      400,
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: "VALIDATION",
        message: issue.message,
      })),
    );
  }

  const sale = parsed.data;
  const row = {
    fecha: sale.date,
    documento: sale.document,
    producto_codigo: sale.productCode.toUpperCase(),
    producto_nombre: sale.productName,
    categoria: sale.category,
    sucursal_codigo: sale.branchCode.toUpperCase(),
    sucursal_nombre: sale.branchName,
    region: sale.region,
    canal_codigo: sale.channelCode.toUpperCase(),
    canal_nombre: sale.channelName,
    empleado_codigo: sale.employeeCode.toUpperCase(),
    empleado_nombre: sale.employeeName,
    cantidad: String(sale.quantity),
    venta_bruta: String(sale.gross),
    descuento: String(sale.discount),
    devolucion: String(sale.returns),
    costo: String(sale.cost),
    meta_venta: String(sale.target),
  };
  const period = sale.date.slice(0, 7);
  const validation = validateImport("VENTAS", [row], period);
  if (validation.errors.length > 0) {
    return fail(
      "La venta no superó la validación comercial.",
      400,
      validation.errors.map((error) => ({
        field: error.field,
        code: error.code,
        message: error.message,
      })),
    );
  }

  try {
    const payload = JSON.stringify(row);
    const load = await registerAndProcessImport({
      authUserId: actor.id,
      fileName: `venta-manual-${sale.document}.json`,
      period,
      checksum: createHash("sha256").update(payload).digest("hex"),
      validation,
    });
    if (load.status !== "COMPLETADA") {
      return fail("La venta no pudo consolidarse.", 422);
    }

    await writeAudit({
      authUserId: actor.id,
      action: "REGISTRAR_VENTA",
      entity: "fact_venta",
      entityId: sale.document,
      result: "EXITO",
      detail: {
        product: sale.productCode,
        quantity: sale.quantity,
        net: sale.gross - sale.discount - sale.returns,
        loadId: load.id,
      },
    });
    await recalculateAfterLoad();

    return ok(
      {
        document: sale.document,
        net: sale.gross - sale.discount - sale.returns,
        margin:
          sale.gross - sale.discount - sale.returns - sale.cost,
        loadId: load.id,
      },
      "Venta registrada y consolidada correctamente.",
    );
  } catch (error) {
    await writeAudit({
      authUserId: actor.id,
      action: "REGISTRAR_VENTA",
      entity: "fact_venta",
      entityId: sale.document,
      result: "ERROR",
      detail: {
        reason: error instanceof Error ? error.message : "error desconocido",
      },
    });
    return fail(
      error instanceof Error ? error.message : "No se pudo registrar la venta.",
      409,
    );
  }
}
