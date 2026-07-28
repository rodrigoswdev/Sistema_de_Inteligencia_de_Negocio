import { describe, expect, it } from "vitest";
import { canAccess } from "@/lib/auth/permissions";
import { createReportSchema, scheduleReportSchema } from "@/lib/validators/reports";

describe("RF-19 a RF-21 · reportes", () => {
  it("acepta un reporte filtrado", () => {
    expect(
      createReportSchema.safeParse({
        name: "Ventas de julio",
        module: "VENTAS",
        format: "EXCEL",
        filters: {
          from: "2026-07-01",
          to: "2026-07-31",
          region: "Occidente",
        },
      }).success,
    ).toBe(true);
  });

  it("valida destinatarios y próxima ejecución", () => {
    expect(
      scheduleReportSchema.safeParse({
        reportId: "1",
        frequency: "MENSUAL",
        recipients: "gerencia@cbn.bo, auditoria@cbn.bo",
        nextRun: "2026-08-01T12:00:00Z",
      }).success,
    ).toBe(true);
  });
});

describe("RF-24 · permisos centralizados", () => {
  it("permite al auditor consultar bitácora", () => {
    expect(
      canAccess(
        {
          id: "1",
          name: "Auditor",
          email: "auditor@cbn.bo",
          roles: ["AUDITOR"],
        },
        "/auditoria",
      ),
    ).toBe(true);
  });

  it("impide que ventas administre cargas", () => {
    expect(
      canAccess(
        {
          id: "2",
          name: "Ventas",
          email: "ventas@cbn.bo",
          roles: ["VENTAS"],
        },
        "/cargas",
      ),
    ).toBe(false);
  });
});
