import type { ImportModule } from "@/lib/validators/imports";

export type RawImportRow = Record<string, string>;

export interface ImportError {
  row?: number;
  field?: string;
  code: "ESTRUCTURA" | "REQUERIDO" | "FORMATO" | "RANGO" | "DUPLICADO";
  message: string;
  value?: string;
}

export interface ValidatedImport {
  module: ImportModule;
  rows: RawImportRow[];
  errors: ImportError[];
}

export interface LoadView {
  id: string;
  date: string;
  module: ImportModule;
  period: string;
  file: string;
  status:
    | "REGISTRADA"
    | "VALIDANDO"
    | "CON_ERRORES"
    | "TRANSFORMANDO"
    | "COMPLETADA"
    | "FALLIDA"
    | "CANCELADA";
  total: number;
  valid: number;
  errors: number;
  quality: number;
  errorDetails?: ImportError[];
}
