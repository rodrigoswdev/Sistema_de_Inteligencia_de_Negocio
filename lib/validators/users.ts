import { z } from "zod";

export const roleSchema = z.enum([
  "ADMINISTRADOR",
  "ANALISTA_BI",
  "VENTAS",
  "FINANZAS",
  "DESEMPENO",
  "GERENCIA",
  "AUDITOR",
]);

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(72),
  roles: z.array(roleSchema).min(1),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    state: z.enum(["ACTIVO", "INACTIVO"]).optional(),
    roles: z.array(roleSchema).min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debe enviar al menos un cambio.",
  });
