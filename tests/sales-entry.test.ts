import { describe, expect, it } from "vitest";
import { canRegisterSales } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/types";
import { manualSaleSchema } from "@/lib/validators/sales";

const sale = {
  date: "2026-07-28",
  document: "FAC-1001",
  productCode: "PROD-01",
  productName: "Paceña Pilsener",
  category: "Cervezas",
  branchCode: "SUC-01",
  branchName: "La Paz",
  region: "Occidente",
  channelCode: "TRAD",
  channelName: "Tradicional",
  employeeCode: "",
  employeeName: "",
  quantity: 10,
  gross: 700,
  discount: 20,
  returns: 0,
  cost: 400,
  target: 750,
};

const userWith = (role: AppRole) => ({
  id: "1",
  name: role,
  email: `${role.toLowerCase()}@cbn.local`,
  roles: [role],
});

describe("registro manual de ventas", () => {
  it("acepta una venta comercial completa", () => {
    expect(manualSaleSchema.safeParse(sale).success).toBe(true);
  });

  it("rechaza descuentos y devoluciones mayores a la venta", () => {
    expect(
      manualSaleSchema.safeParse({
        ...sale,
        discount: 600,
        returns: 200,
      }).success,
    ).toBe(false);
  });

  it("permite los roles que tienen acceso a Ventas", () => {
    for (const role of [
      "ADMINISTRADOR",
      "ANALISTA_BI",
      "VENTAS",
      "GERENCIA",
      "AUDITOR",
    ] satisfies AppRole[]) {
      expect(canRegisterSales(userWith(role))).toBe(true);
    }
  });

  it("bloquea los roles ajenos al módulo", () => {
    expect(canRegisterSales(userWith("FINANZAS"))).toBe(false);
    expect(canRegisterSales(userWith("DESEMPENO"))).toBe(false);
  });
});
