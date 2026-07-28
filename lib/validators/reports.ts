import { z } from "zod";

const filtersSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  region: z.string().max(80).optional(),
  product: z.string().max(150).optional(),
  channel: z.string().max(100).optional(),
  unit: z.string().max(120).optional(),
  scenario: z.string().max(30).optional(),
});

export const createReportSchema = z.object({
  name: z.string().trim().min(3).max(150),
  module: z.enum(["EJECUTIVO", "VENTAS", "FINANZAS", "DESEMPENO"]),
  format: z.enum(["PDF", "EXCEL"]),
  filters: filtersSchema.default({}),
});

export const scheduleReportSchema = z.object({
  reportId: z.string().regex(/^\d+$/, "Reporte inválido"),
  frequency: z.enum(["DIARIA", "SEMANAL", "MENSUAL", "TRIMESTRAL"]),
  recipients: z
    .string()
    .trim()
    .min(3)
    .max(2000)
    .refine(
      (value) =>
        value
          .split(/[;,]/)
          .map((email) => email.trim())
          .every((email) => z.string().email().safeParse(email).success),
      "Incluya correos válidos separados por coma",
    ),
  nextRun: z.coerce.date().optional(),
});
