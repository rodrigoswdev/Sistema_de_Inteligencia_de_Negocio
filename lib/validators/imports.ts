import { z } from "zod";

export const importModuleSchema = z.enum([
  "VENTAS",
  "FINANZAS",
  "DESEMPENO",
]);

export type ImportModule = z.infer<typeof importModuleSchema>;

export const importSchema = z.object({
  module: importModuleSchema,
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use el periodo AAAA-MM"),
  sourceId: z.string().regex(/^\d+$/, "Seleccione una fuente válida").optional(),
});

const commonAliases: Record<string, string> = {
  fecha: "fecha",
  date: "fecha",
  documento: "documento",
  factura: "documento",
};

export const headerAliases: Record<ImportModule, Record<string, string>> = {
  VENTAS: {
    ...commonAliases,
    producto: "producto_nombre",
    producto_codigo: "producto_codigo",
    producto_nombre: "producto_nombre",
    categoria: "categoria",
    sucursal: "sucursal_nombre",
    sucursal_codigo: "sucursal_codigo",
    sucursal_nombre: "sucursal_nombre",
    region: "region",
    canal: "canal_nombre",
    canal_codigo: "canal_codigo",
    canal_nombre: "canal_nombre",
    empleado_codigo: "empleado_codigo",
    empleado_nombre: "empleado_nombre",
    cantidad: "cantidad",
    venta_bruta: "venta_bruta",
    descuento: "descuento",
    devolucion: "devolucion",
    costo: "costo",
    meta_venta: "meta_venta",
  },
  FINANZAS: {
    ...commonAliases,
    cuenta_codigo: "cuenta_codigo",
    cuenta_nombre: "cuenta_nombre",
    tipo_cuenta: "tipo_cuenta",
    nivel: "nivel",
    centro_costo_codigo: "centro_costo_codigo",
    centro_costo_nombre: "centro_costo_nombre",
    sucursal_codigo: "sucursal_codigo",
    sucursal_nombre: "sucursal_nombre",
    region: "region",
    escenario_codigo: "escenario_codigo",
    escenario_nombre: "escenario_nombre",
    importe: "importe",
    debito: "debito",
    credito: "credito",
  },
  DESEMPENO: {
    ...commonAliases,
    kpi_codigo: "kpi_codigo",
    kpi_nombre: "kpi_nombre",
    unidad_medida: "unidad_medida",
    sentido: "sentido",
    unidad_codigo: "unidad_codigo",
    unidad_nombre: "unidad_nombre",
    empleado_codigo: "empleado_codigo",
    empleado_nombre: "empleado_nombre",
    valor_meta: "valor_meta",
    valor_real: "valor_real",
  },
};

export const requiredHeaders: Record<ImportModule, string[]> = {
  VENTAS: [
    "fecha",
    "documento",
    "producto_codigo",
    "producto_nombre",
    "categoria",
    "sucursal_codigo",
    "sucursal_nombre",
    "region",
    "canal_codigo",
    "canal_nombre",
    "cantidad",
    "venta_bruta",
    "costo",
  ],
  FINANZAS: [
    "fecha",
    "cuenta_codigo",
    "cuenta_nombre",
    "tipo_cuenta",
    "nivel",
    "escenario_codigo",
    "escenario_nombre",
    "importe",
  ],
  DESEMPENO: [
    "fecha",
    "kpi_codigo",
    "kpi_nombre",
    "unidad_medida",
    "sentido",
    "unidad_codigo",
    "unidad_nombre",
    "valor_meta",
    "valor_real",
  ],
};
