import { describe, expect, it } from "vitest";
import { createSourceSchema, updateSourceSchema } from "@/lib/validators/sources";
import { createUserSchema, updateUserSchema } from "@/lib/validators/users";

describe("RF-02 validación de usuarios", () => {
  it("acepta un usuario con rol válido", () => {
    expect(
      createUserSchema.safeParse({
        name: "Ana Administradora",
        email: "ana@empresa.com",
        password: "Temporal123",
        roles: ["ADMINISTRADOR"],
      }).success,
    ).toBe(true);
  });

  it("rechaza usuario sin rol y contraseña corta", () => {
    expect(
      createUserSchema.safeParse({
        name: "Ana",
        email: "ana@empresa.com",
        password: "123",
        roles: [],
      }).success,
    ).toBe(false);
  });

  it("exige al menos un cambio al actualizar", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });
});

describe("RF-03 validación de fuentes", () => {
  it("acepta una fuente controlada", () => {
    expect(
      createSourceSchema.safeParse({
        name: "Ventas mensual",
        type: "CSV",
        module: "VENTAS",
        frequency: "MENSUAL",
      }).success,
    ).toBe(true);
  });

  it("rechaza módulos y tipos desconocidos", () => {
    expect(
      createSourceSchema.safeParse({
        name: "Origen",
        type: "TXT",
        module: "OTRO",
      }).success,
    ).toBe(false);
  });

  it("permite activar o desactivar una fuente", () => {
    expect(updateSourceSchema.safeParse({ active: false }).success).toBe(true);
  });
});
