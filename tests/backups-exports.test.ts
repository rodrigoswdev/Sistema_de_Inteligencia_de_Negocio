import { describe, expect, it } from "vitest";
import { backupConfigSchema } from "@/lib/validators/backups";
import {
  createProfessionalPdf,
  createSpreadsheet,
} from "@/lib/services/exports";

describe("copias de seguridad", () => {
  it("acepta programación semanal y retención", () => {
    expect(
      backupConfigSchema.safeParse({
        frequency: "SEMANAL",
        time: "02:30",
        weekDay: 0,
        monthDay: null,
        retention: 12,
        includeAudit: true,
        active: true,
      }).success,
    ).toBe(true);
  });

  it("exige día cuando la frecuencia es mensual", () => {
    expect(
      backupConfigSchema.safeParse({
        frequency: "MENSUAL",
        time: "02:30",
        retention: 12,
        includeAudit: true,
        active: true,
      }).success,
    ).toBe(false);
  });
});

describe("documentos profesionales", () => {
  const rows = [
    { Indicador: "Ventas netas", Resultado: 120000, Estado: "VERDE" },
    { Indicador: "Margen", Resultado: 38.5, Estado: "AMARILLO" },
  ];

  it("genera un PDF válido con título corporativo", () => {
    const pdf = createProfessionalPdf({ title: "Reporte ejecutivo", rows });
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(pdf.toString()).toContain("Reporte ejecutivo");
  });

  it("genera una hoja con estilos, filtros y encabezado", () => {
    const spreadsheet = createSpreadsheet(rows, {
      title: "Reporte ejecutivo",
    }).toString();
    expect(spreadsheet).toContain('ss:ID="Title"');
    expect(spreadsheet).toContain("<AutoFilter");
    expect(spreadsheet).toContain("Reporte ejecutivo");
  });
});
