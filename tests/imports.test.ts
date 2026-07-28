import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/imports/parser";
import { validateImport } from "@/lib/imports/validation";

function csvBuffer(value: string) {
  return new TextEncoder().encode(value).buffer;
}

describe("RF-04 a RF-09 · cargas controladas", () => {
  it("interpreta CSV con campos entre comillas", () => {
    const rows = parseCsv(
      csvBuffer(
        'fecha,documento,producto_nombre\n2026-07-01,F-1,"Paceña, Pilsener"\n',
      ),
    );
    expect(rows[0].producto_nombre).toBe("Paceña, Pilsener");
  });

  it("acepta ventas completas y normaliza números opcionales", () => {
    const result = validateImport("VENTAS", [
      {
        fecha: "2026-07-01",
        documento: "FAC-001",
        producto_codigo: "PROD-01",
        producto_nombre: "Paceña",
        categoria: "Cervezas",
        sucursal_codigo: "SUC-01",
        sucursal_nombre: "La Paz",
        region: "Occidente",
        canal_codigo: "TRAD",
        canal_nombre: "Tradicional",
        cantidad: "10",
        venta_bruta: "700",
        costo: "400",
      },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].descuento).toBe("0");
  });

  it("detecta columnas faltantes, fechas inválidas y negativos", () => {
    const result = validateImport("FINANZAS", [
      {
        fecha: "31/07/2026",
        cuenta_codigo: "4100",
        cuenta_nombre: "Ingresos",
        tipo_cuenta: "INGRESO",
        nivel: "1",
        escenario_codigo: "REAL",
        importe: "-10",
      },
    ]);
    expect(result.errors.some((error) => error.code === "ESTRUCTURA")).toBe(true);
    expect(result.errors.some((error) => error.field === "fecha")).toBe(true);
    expect(result.errors.some((error) => error.code === "RANGO")).toBe(true);
  });

  it("rechaza claves de negocio repetidas", () => {
    const row = {
      fecha: "2026-07-31",
      kpi_codigo: "DES-01",
      kpi_nombre: "Cumplimiento",
      unidad_medida: "%",
      sentido: "MAYOR_MEJOR",
      unidad_codigo: "UNI-01",
      unidad_nombre: "Ventas",
      valor_meta: "100",
      valor_real: "95",
    };
    const result = validateImport("DESEMPENO", [row, row]);
    expect(result.errors.some((error) => error.code === "DUPLICADO")).toBe(true);
  });
});
