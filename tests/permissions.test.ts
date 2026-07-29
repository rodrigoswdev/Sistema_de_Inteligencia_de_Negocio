import { describe, expect, it } from "vitest";
import { canAccess, landingPath } from "@/lib/auth/permissions";

describe("control de acceso", () => {
  const user = { id: "1", name: "Ventas", email: "v@cbn.bo", roles: ["VENTAS" as const] };
  it("permite su módulo", () => expect(canAccess(user, "/ventas")).toBe(true));
  it("impide administración", () => expect(canAccess(user, "/administracion")).toBe(false));
  it("envía ventas a su módulo", () => expect(landingPath(user)).toBe("/ventas"));
});
