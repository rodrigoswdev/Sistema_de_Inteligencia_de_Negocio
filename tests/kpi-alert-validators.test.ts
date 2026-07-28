import { describe, expect, it } from "vitest";
import { updateAlertSchema } from "@/lib/validators/alerts";
import { createKpiSchema, updateKpiSchema } from "@/lib/validators/kpis";

describe("RF-16 · configuración KPI", () => {
  const kpi = {
    code: "ven-10",
    name: "Cumplimiento comercial",
    module: "VENTAS",
    formula: "venta_neta / meta * 100",
    unit: "%",
    direction: "MAYOR_MEJOR",
    frequency: "MENSUAL",
    target: 100,
    thresholds: [
      { level: "VERDE", from: 100, color: "bg-green-500" },
      { level: "AMARILLO", from: 90, to: 100, color: "bg-amber-500" },
      { level: "ROJO", to: 90, color: "bg-red-500" },
    ],
  };

  it("acepta y normaliza una definición completa", () => {
    const result = createKpiSchema.parse(kpi);
    expect(result.code).toBe("VEN-10");
    expect(result.thresholds).toHaveLength(3);
  });

  it("permite desactivar un KPI", () => {
    expect(updateKpiSchema.safeParse({ active: false }).success).toBe(true);
  });
});

describe("RF-18 · gestión de alertas", () => {
  it("acepta atención con comentario", () => {
    expect(
      updateAlertSchema.safeParse({
        status: "ATENDIDA",
        comment: "Se asignó plan de acción.",
      }).success,
    ).toBe(true);
  });

  it("rechaza estados desconocidos", () => {
    expect(updateAlertSchema.safeParse({ status: "ELIMINADA" }).success).toBe(
      false,
    );
  });
});
