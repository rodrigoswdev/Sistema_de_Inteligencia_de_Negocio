import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/imports/parser";
import { validateImport } from "@/lib/imports/validation";
import type { ImportModule } from "@/lib/validators/imports";

const samples: Array<{ module: ImportModule; file: string }> = [
  { module: "VENTAS", file: "ventas_2026-07.csv" },
  { module: "FINANZAS", file: "finanzas_2026-07.csv" },
  { module: "DESEMPENO", file: "desempeno_2026-07.csv" },
];

describe("archivos de ejemplo para carga", () => {
  for (const sample of samples) {
    it(`valida las 10 filas de ${sample.module}`, () => {
      const buffer = readFileSync(
        resolve("datos-ejemplo", sample.file),
      );
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;
      const rows = parseCsv(arrayBuffer);
      const result = validateImport(sample.module, rows, "2026-07");

      expect(rows).toHaveLength(10);
      expect(result.errors).toEqual([]);
    });
  }
});
