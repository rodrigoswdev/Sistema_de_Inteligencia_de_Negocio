import { z } from "zod";
import { importModuleSchema } from "@/lib/validators/imports";

const thresholdSchema = z.object({
  level: z.enum(["VERDE", "AMARILLO", "ROJO"]),
  from: z.number().finite().nullable().optional(),
  to: z.number().finite().nullable().optional(),
  color: z.string().min(2).max(80),
});

export const createKpiSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(3).max(150),
  module: importModuleSchema,
  formula: z.string().trim().min(3).max(1000),
  unit: z.string().trim().min(1).max(30),
  direction: z.enum(["MAYOR_MEJOR", "MENOR_MEJOR", "RANGO", "INFORMATIVO"]),
  frequency: z.enum(["DIARIA", "SEMANAL", "MENSUAL", "TRIMESTRAL", "ANUAL"]),
  target: z.number().finite().nullable().optional(),
  thresholds: z.array(thresholdSchema).max(3).default([]),
});

export const updateKpiSchema = createKpiSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "Envíe al menos un cambio");
