import {
  headerAliases,
  requiredHeaders,
  type ImportModule,
} from "@/lib/validators/imports";
import type {
  ImportError,
  RawImportRow,
  ValidatedImport,
} from "@/lib/imports/types";

const numericFields: Record<ImportModule, string[]> = {
  VENTAS: [
    "cantidad",
    "venta_bruta",
    "descuento",
    "devolucion",
    "costo",
    "meta_venta",
  ],
  FINANZAS: ["nivel", "importe", "debito", "credito"],
  DESEMPENO: ["valor_meta", "valor_real"],
};

const optionalNumbers = new Set([
  "descuento",
  "devolucion",
  "meta_venta",
  "debito",
  "credito",
]);

function canonicalize(module: ImportModule, row: RawImportRow) {
  return Object.fromEntries(
    Object.entries(row).map(([header, value]) => [
      headerAliases[module][header] ?? header,
      value.trim(),
    ]),
  );
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateImport(
  module: ImportModule,
  inputRows: RawImportRow[],
  period?: string,
): ValidatedImport {
  const rows = inputRows.map((row) => canonicalize(module, row));
  const errors: ImportError[] = [];
  if (rows.length === 0) {
    errors.push({
      code: "ESTRUCTURA",
      message: "El archivo no contiene filas de datos.",
    });
    return { module, rows, errors };
  }

  const headers = new Set(Object.keys(rows[0]));
  for (const field of requiredHeaders[module]) {
    if (!headers.has(field)) {
      errors.push({
        field,
        code: "ESTRUCTURA",
        message: `Falta la columna obligatoria ${field}.`,
      });
    }
  }

  const uniqueKeys = new Set<string>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    for (const field of requiredHeaders[module]) {
      if (!row[field]) {
        errors.push({
          row: rowNumber,
          field,
          code: "REQUERIDO",
          message: "El valor es obligatorio.",
        });
      }
    }
    if (row.fecha && !isDate(row.fecha)) {
      errors.push({
        row: rowNumber,
        field: "fecha",
        code: "FORMATO",
        message: "La fecha debe usar AAAA-MM-DD.",
        value: row.fecha,
      });
    } else if (period && row.fecha && !row.fecha.startsWith(`${period}-`)) {
      errors.push({
        row: rowNumber,
        field: "fecha",
        code: "RANGO",
        message: `La fecha no pertenece al periodo ${period}.`,
        value: row.fecha,
      });
    }
    for (const field of numericFields[module]) {
      const value = row[field];
      if (!value && optionalNumbers.has(field)) {
        row[field] = "0";
        continue;
      }
      const number = Number(value);
      if (value && !Number.isFinite(number)) {
        errors.push({
          row: rowNumber,
          field,
          code: "FORMATO",
          message: "Debe ser un número válido.",
          value,
        });
      } else if (Number.isFinite(number) && number < 0) {
        errors.push({
          row: rowNumber,
          field,
          code: "RANGO",
          message: "No se permiten valores negativos.",
          value,
        });
      }
    }
    if (
      module === "DESEMPENO" &&
      row.sentido &&
      !["MAYOR_MEJOR", "MENOR_MEJOR", "RANGO", "INFORMATIVO"].includes(
        row.sentido,
      )
    ) {
      errors.push({
        row: rowNumber,
        field: "sentido",
        code: "FORMATO",
        message:
          "Use MAYOR_MEJOR, MENOR_MEJOR, RANGO o INFORMATIVO.",
        value: row.sentido,
      });
    }
    const key =
      module === "VENTAS"
        ? `${row.documento}|${row.producto_codigo}`
        : module === "FINANZAS"
          ? `${row.fecha}|${row.cuenta_codigo}|${row.centro_costo_codigo ?? ""}|${row.escenario_codigo}`
          : `${row.fecha}|${row.kpi_codigo}|${row.unidad_codigo}`;
    if (uniqueKeys.has(key)) {
      errors.push({
        row: rowNumber,
        code: "DUPLICADO",
        message: "La clave de negocio está duplicada dentro del archivo.",
        value: key,
      });
    }
    uniqueKeys.add(key);
  });

  const invalidRows = new Set(
    errors.flatMap((error) => (error.row ? [error.row - 2] : [])),
  );
  return {
    module,
    rows,
    errors,
    // The repository processes the complete file only when it has no errors.
    ...(invalidRows.size > 0 ? {} : {}),
  };
}
