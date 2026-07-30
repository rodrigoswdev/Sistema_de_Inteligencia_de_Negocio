import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backupConfigSchema } from "@/lib/validators/backups";
import {
  createProfessionalPdf,
  createSpreadsheet,
} from "@/lib/services/exports";

function storedZipEntry(workbook: Buffer, expectedName: string) {
  let offset = 0;
  while (offset + 30 <= workbook.length) {
    if (workbook.readUInt32LE(offset) !== 0x04034b50) break;
    const method = workbook.readUInt16LE(offset + 8);
    const size = workbook.readUInt32LE(offset + 18);
    const nameLength = workbook.readUInt16LE(offset + 26);
    const extraLength = workbook.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = workbook
      .subarray(nameStart, nameStart + nameLength)
      .toString("utf8");
    const dataStart = nameStart + nameLength + extraLength;
    if (name === expectedName) {
      expect(method).toBe(0);
      return workbook.subarray(dataStart, dataStart + size).toString("utf8");
    }
    offset = dataStart + size;
  }
  throw new Error(`No se encontró ${expectedName} dentro del XLSX.`);
}

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
    {
      Indicador: "Ventas netas",
      Región: "Occidente",
      "Resultado Bs": 120000,
      Estado: "VERDE",
    },
    {
      Indicador: "Margen",
      Región: "Oriente",
      "Resultado Bs": 38500.5,
      Estado: "AMARILLO",
    },
  ];

  it("genera un PDF paginado, válido y con caracteres españoles", () => {
    const pdf = createProfessionalPdf({
      title: "Reporte ejecutivo",
      metadata: ["Región: Occidente"],
      rows,
    });
    const content = pdf.toString("latin1");
    expect(pdf.subarray(0, 8).toString()).toBe("%PDF-1.4");
    expect(content).toContain("Reporte ejecutivo");
    expect(content).toContain("Región");
    expect(content).toContain("Página 1 de 1");
    expect(content).toContain("%%EOF");
    if (process.env.EXPORT_CHECK_DIR) {
      mkdirSync(process.env.EXPORT_CHECK_DIR, { recursive: true });
      writeFileSync(
        join(process.env.EXPORT_CHECK_DIR, "verificacion-ventas.pdf"),
        pdf,
      );
    }
  });

  it("genera un libro XLSX real con resumen, datos, estilos y filtros", () => {
    const workbook = createSpreadsheet(rows, {
      title: "Reporte ejecutivo",
      metadata: ["Región: Occidente"],
    });
    expect(workbook.subarray(0, 4).toString("hex")).toBe("504b0304");

    const workbookXml = storedZipEntry(workbook, "xl/workbook.xml");
    const dataXml = storedZipEntry(workbook, "xl/worksheets/sheet2.xml");
    const stylesXml = storedZipEntry(workbook, "xl/styles.xml");

    expect(workbookXml).toContain('name="Resumen"');
    expect(workbookXml).toContain('name="Datos"');
    expect(dataXml).toContain("<autoFilter");
    expect(dataXml).toContain("Región");
    expect(dataXml).toContain("Reporte ejecutivo");
    expect(stylesXml).toContain('formatCode="#,##0.00 &quot;Bs&quot;"');
    if (process.env.EXPORT_CHECK_DIR) {
      mkdirSync(process.env.EXPORT_CHECK_DIR, { recursive: true });
      writeFileSync(
        join(process.env.EXPORT_CHECK_DIR, "verificacion-ventas.xlsx"),
        workbook,
      );
    }
  });
});
