export type AppRole =
  | "ADMINISTRADOR"
  | "ANALISTA_BI"
  | "VENTAS"
  | "FINANZAS"
  | "DESEMPENO"
  | "GERENCIA"
  | "AUDITOR";

export type TrafficLight = "VERDE" | "AMARILLO" | "ROJO" | "NEUTRO";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: AppRole[];
}

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  region?: string;
  product?: string;
  channel?: string;
  unit?: string;
  scenario?: string;
}

export interface ChartPoint {
  label: string;
  value: number;
  comparison?: number;
  status?: TrafficLight;
}

export interface KpiValue {
  code: string;
  label: string;
  value: number | null;
  formatted: string;
  variation?: number | null;
  helper: string;
  status: TrafficLight;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    generatedAt: string;
    simulated: boolean;
    filters?: AnalyticsFilters;
  };
  message: string;
  errors: Array<{ field?: string; code: string; message: string }>;
  requestId: string;
}
