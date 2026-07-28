import type { AppRole, TrafficLight } from "@/lib/types";

export const DATA_UPDATED_AT = "2026-07-25T21:30:00-04:00";

export const demoUsers: Array<{
  id: string;
  name: string;
  email: string;
  password: string;
  roles: AppRole[];
  active: boolean;
}> = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Ana Administradora",
    email: "admin@cbn.local",
    password: "Password123",
    roles: ["ADMINISTRADOR"],
    active: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Marco Analista BI",
    email: "analista@cbn.local",
    password: "Password123",
    roles: ["ANALISTA_BI"],
    active: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Elena Gerencia",
    email: "gerencia@cbn.local",
    password: "Password123",
    roles: ["GERENCIA"],
    active: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Carla Ventas",
    email: "ventas@cbn.local",
    password: "Password123",
    roles: ["VENTAS"],
    active: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Diego Finanzas",
    email: "finanzas@cbn.local",
    password: "Password123",
    roles: ["FINANZAS"],
    active: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    name: "Lucía Desempeño",
    email: "desempeno@cbn.local",
    password: "Password123",
    roles: ["DESEMPENO"],
    active: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    name: "Raúl Auditor",
    email: "auditor@cbn.local",
    password: "Password123",
    roles: ["AUDITOR"],
    active: true,
  },
];

const regions = [
  ["Occidente", "La Paz"],
  ["Oriente", "Santa Cruz"],
  ["Centro", "Cochabamba"],
  ["Sur", "Chuquisaca"],
] as const;
const products = [
  ["Paceña Pilsener", "Cervezas"],
  ["Huari Tradicional", "Cervezas"],
  ["Malta Real", "Bebidas de malta"],
] as const;
const channels = ["Tradicional", "Moderno", "Distribuidor"] as const;
const factors = [0.82, 0.88, 0.93, 1.02, 1.08, 1.15, 1.11];

export const sales = factors.flatMap((factor, month) =>
  regions.flatMap(([region, department], regionIndex) =>
    products.map(([product, category], productIndex) => {
      const gross = Math.round(
        (720_000 + regionIndex * 145_000 + productIndex * 97_000) * factor,
      );
      const discounts = Math.round(gross * (0.025 + productIndex * 0.004));
      const returns = Math.round(gross * (0.006 + regionIndex * 0.001));
      const net = gross - discounts - returns;
      const cost = Math.round(gross * (0.57 + productIndex * 0.015));
      return {
        id: `${month}-${regionIndex}-${productIndex}`,
        date: `2026-${String(month + 1).padStart(2, "0")}-15`,
        document: `FAC-${month + 1}${regionIndex}${productIndex}`,
        region,
        department,
        branch: department,
        product,
        category,
        channel: channels[(month + regionIndex + productIndex) % channels.length],
        employee: ["Carla Rojas", "Diego Flores", "Lucía Pérez"][productIndex],
        quantity: Math.round(gross / (55 + productIndex * 8)),
        gross,
        discounts,
        returns,
        net,
        cost,
        margin: net - cost,
        target: Math.round((720_000 + regionIndex * 145_000 + productIndex * 97_000) * 1.02),
      };
    }),
  ),
);

const financeAreas = ["Comercial", "Operaciones", "Logística", "Administración"];
export const finances = factors.flatMap((factor, month) =>
  financeAreas.map((area, index) => {
    const income = Math.round((3_200_000 + index * 280_000) * factor);
    const costs = Math.round(income * (0.52 + index * 0.02));
    const opex = Math.round(income * (0.13 + index * 0.01));
    return {
      id: `${month}-${index}`,
      date: `2026-${String(month + 1).padStart(2, "0")}-20`,
      area,
      costCenter: `CC-${101 + index}`,
      region: regions[index][0],
      income,
      costs,
      opex,
      budget: Math.round((3_100_000 + index * 300_000) * factor),
      cashFlow: Math.round(income * (0.18 - index * 0.01)),
    };
  }),
);

const units = ["Ventas", "Finanzas", "Operaciones", "Logística", "Administración"];
const bases = [98, 94, 91, 84, 96];
export const performances = factors.flatMap((_factor, month) =>
  units.map((unit, index) => {
    const value = Math.min(
      105,
      bases[index] + month * 0.45 - (index === 3 ? month * 0.2 : 0),
    );
    const status: TrafficLight =
      value >= 95 ? "VERDE" : value >= 90 ? "AMARILLO" : "ROJO";
    return {
      id: `${month}-${index}`,
      date: `2026-${String(month + 1).padStart(2, "0")}-25`,
      unit,
      kpi: ["Meta", "Margen", "Productividad", "Calidad", "Frescura"][index],
      target: 100,
      value,
      achievement: value,
      status,
    };
  }),
);

export const demoAlerts = [
  {
    id: 1,
    severity: "CRITICA",
    message: "Calidad de carga de Ventas por debajo del umbral",
    module: "DATOS",
    status: "ABIERTA",
    period: "Julio 2026",
    createdAt: "2026-07-25T21:30:00-04:00",
  },
  {
    id: 2,
    severity: "ALTA",
    message: "Región Centro por debajo de la meta comercial",
    module: "VENTAS",
    status: "ABIERTA",
    period: "Julio 2026",
    createdAt: "2026-07-24T18:00:00-04:00",
  },
  {
    id: 3,
    severity: "MEDIA",
    message: "OPEX supera en 3% el plan mensual",
    module: "FINANZAS",
    status: "ATENDIDA",
    period: "Julio 2026",
    createdAt: "2026-07-23T10:00:00-04:00",
  },
];

export const demoLoads = [
  {
    id: "carga-1",
    date: "2026-07-25T21:30:00-04:00",
    module: "VENTAS",
    file: "ventas_julio.csv",
    status: "COMPLETADA",
    valid: 12540,
    errors: 0,
    quality: 100,
  },
  {
    id: "carga-2",
    date: "2026-07-25T20:10:00-04:00",
    module: "FINANZAS",
    file: "finanzas_junio.csv",
    status: "CON_ERRORES",
    valid: 8112,
    errors: 27,
    quality: 99.67,
  },
  {
    id: "carga-3",
    date: "2026-07-24T18:45:00-04:00",
    module: "DESEMPENO",
    file: "metas_q2.csv",
    status: "COMPLETADA",
    valid: 340,
    errors: 2,
    quality: 99.42,
  },
];

export const kpiCatalog = [
  ["VEN-01", "Ventas netas", "VENTAS", "Venta bruta - descuentos - devoluciones", "Bs", "MAYOR_MEJOR"],
  ["VEN-02", "Crecimiento de ventas", "VENTAS", "(Actual - anterior) / anterior × 100", "%", "MAYOR_MEJOR"],
  ["VEN-05", "Margen bruto", "VENTAS", "(Venta neta - costo) / venta neta × 100", "%", "MAYOR_MEJOR"],
  ["FIN-03", "EBITDA", "FINANZAS", "Ingresos - costos - gastos operativos", "Bs", "MAYOR_MEJOR"],
  ["FIN-05", "Variación presupuestaria", "FINANZAS", "(Real - presupuesto) / presupuesto × 100", "%", "RANGO"],
  ["DES-01", "Cumplimiento global", "DESEMPENO", "Promedio ponderado de cumplimiento", "%", "MAYOR_MEJOR"],
  ["DAT-01", "Calidad de datos", "DATOS", "Filas válidas / filas totales × 100", "%", "MAYOR_MEJOR"],
] as const;

export const auditEvents = [
  { id: 1, user: "Ana Administradora", action: "INICIO_SESION", entity: "usuario", result: "EXITO", date: "2026-07-25T21:35:00-04:00" },
  { id: 2, user: "Marco Analista BI", action: "PROCESAR_CARGA", entity: "carga_dato", result: "EXITO", date: "2026-07-25T21:30:00-04:00" },
  { id: 3, user: "Elena Gerencia", action: "EXPORTAR_REPORTE", entity: "reporte", result: "EXITO", date: "2026-07-25T19:10:00-04:00" },
];

