import { z } from "zod";

export const backupConfigSchema = z
  .object({
    frequency: z.enum(["DIARIA", "SEMANAL", "MENSUAL"]),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
    weekDay: z.number().int().min(0).max(6).nullable().optional(),
    monthDay: z.number().int().min(1).max(28).nullable().optional(),
    retention: z.number().int().min(1).max(100),
    includeAudit: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.frequency === "SEMANAL" && value.weekDay == null) {
      context.addIssue({
        code: "custom",
        path: ["weekDay"],
        message: "Seleccione un día de la semana",
      });
    }
    if (value.frequency === "MENSUAL" && value.monthDay == null) {
      context.addIssue({
        code: "custom",
        path: ["monthDay"],
        message: "Seleccione un día del mes",
      });
    }
  });
