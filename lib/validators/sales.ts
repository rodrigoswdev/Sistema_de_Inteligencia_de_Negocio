import { z } from "zod";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio.`)
    .max(max, `${label} supera el máximo permitido.`);

const nonNegative = (label: string) =>
  z.coerce
    .number({ error: `${label} debe ser un número válido.` })
    .finite()
    .nonnegative(`${label} no puede ser negativo.`);

export const manualSaleSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use una fecha válida."),
    document: requiredText("El documento", 50),
    productCode: requiredText("El código de producto", 30),
    productName: requiredText("El producto", 120),
    category: requiredText("La categoría", 80),
    branchCode: requiredText("El código de sucursal", 30),
    branchName: requiredText("La sucursal", 120),
    region: requiredText("La región", 80),
    channelCode: requiredText("El código de canal", 30),
    channelName: requiredText("El canal", 100),
    employeeCode: z.string().trim().max(30).optional().default(""),
    employeeName: z.string().trim().max(120).optional().default(""),
    quantity: nonNegative("La cantidad").positive(
      "La cantidad debe ser mayor que cero.",
    ),
    gross: nonNegative("La venta bruta"),
    discount: nonNegative("El descuento").default(0),
    returns: nonNegative("La devolución").default(0),
    cost: nonNegative("El costo"),
    target: nonNegative("La meta de venta").default(0),
  })
  .refine((sale) => sale.discount + sale.returns <= sale.gross, {
    message:
      "La suma del descuento y la devolución no puede superar la venta bruta.",
    path: ["discount"],
  })
  .refine(
    (sale) =>
      (!sale.employeeCode && !sale.employeeName) ||
      Boolean(sale.employeeCode && sale.employeeName),
    {
      message: "Complete el código y el nombre del vendedor, o deje ambos vacíos.",
      path: ["employeeCode"],
    },
  );

export type ManualSaleInput = z.infer<typeof manualSaleSchema>;
