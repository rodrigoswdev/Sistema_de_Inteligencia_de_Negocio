import { z } from "zod";

export const updateAlertSchema = z.object({
  status: z.enum(["ABIERTA", "ATENDIDA", "CERRADA"]),
  comment: z.string().trim().max(1000).optional(),
});
