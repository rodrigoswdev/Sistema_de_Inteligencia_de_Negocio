import { z } from "zod";

const fields = {
  name: z.string().trim().min(2).max(120),
  type: z.enum(["CSV", "EXCEL", "API", "BD"]),
  module: z.enum(["VENTAS", "FINANZAS", "DESEMPENO"]),
  frequency: z.string().trim().min(2).max(30).optional(),
  configuration: z.record(z.string(), z.unknown()).optional(),
};

export const createSourceSchema = z.object(fields);

export const updateSourceSchema = z
  .object({
    name: fields.name.optional(),
    type: fields.type.optional(),
    module: fields.module.optional(),
    frequency: z.string().trim().min(2).max(30).nullable().optional(),
    active: z.boolean().optional(),
    configuration: fields.configuration,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debe enviar al menos un cambio.",
  });
