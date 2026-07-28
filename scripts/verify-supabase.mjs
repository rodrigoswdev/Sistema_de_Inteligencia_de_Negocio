import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (
  process.platform === "win32" &&
  nodeMajor >= 22 &&
  process.env.SIBI_SYSTEM_CA !== "1"
) {
  const child = spawnSync(
    process.execPath,
    ["--use-system-ca", fileURLToPath(import.meta.url)],
    {
      env: { ...process.env, SIBI_SYSTEM_CA: "1" },
      stdio: "inherit",
    },
  );
  process.exit(child.status ?? 1);
}

const { Client } = pg;
const results = [];

function record(service, ok, detail) {
  results.push({ service, ok, detail });
  console.log(`${ok ? "OK" : "ERROR"} ${service}: ${detail}`);
}

async function httpCheck(name, path, headers = {}, acceptedStatuses = []) {
  try {
    const response = await fetch(
      new URL(path, process.env.NEXT_PUBLIC_SUPABASE_URL),
      {
        headers,
        signal: AbortSignal.timeout(15_000),
      },
    );
    const body = response.ok ? "" : (await response.text()).slice(0, 180);
    const accepted = response.ok || acceptedStatuses.includes(response.status);
    record(
      name,
      accepted,
      `HTTP ${response.status}${
        accepted && !response.ok ? " · endpoint protegido por RLS" : ""
      }${!accepted && body ? ` · ${body.replace(/\s+/g, " ")}` : ""}`,
    );
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : "sin respuesta");
  }
}

async function databaseCheck(name, connectionString) {
  if (!connectionString) {
    record(name, false, "cadena no configurada");
    return;
  }
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 15_000,
  });
  try {
    await client.connect();
    const response = await client.query(`
      select
        to_regclass('public.usuario') is not null as usuario,
        to_regclass('public.fact_venta') is not null as fact_venta,
        to_regclass('public.bitacora') is not null as bitacora
    `);
    const schema = response.rows[0];
    record(
      name,
      true,
      schema.usuario && schema.fact_venta && schema.bitacora
        ? "conectada; esquema SIBI instalado"
        : "conectada; esquema SIBI incompleto",
    );
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : "conexión fallida");
  } finally {
    await client.end().catch(() => undefined);
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
await httpCheck("Supabase Auth", "/auth/v1/health", headers);
await httpCheck(
  "Supabase REST",
  "/rest/v1/rol?select=id&limit=1",
  headers,
  [401, 403],
);

const tables = [
  "rol", "usuario", "usuario_rol", "fuente_dato", "carga_dato",
  "error_carga", "dim_fecha", "dim_producto", "dim_sucursal", "dim_canal",
  "dim_empleado", "dim_cuenta", "dim_centro_costo", "dim_escenario",
  "dim_unidad", "dim_kpi", "fact_venta", "fact_finanza",
  "fact_desempeno", "kpi_definicion", "kpi_umbral", "alerta", "reporte",
  "reporte_programado", "bitacora",
  "configuracion_copia", "copia_seguridad",
];
const missingTables = [];
for (const table of tables) {
  const response = await fetch(
    new URL(`/rest/v1/${table}?select=*&limit=0`, url),
    { headers, signal: AbortSignal.timeout(15_000) },
  );
  if (response.status === 404) missingTables.push(table);
}
record(
  "Esquema SIBI",
  missingTables.length === 0,
  missingTables.length === 0
    ? `${tables.length}/${tables.length} tablas detectadas`
    : `faltan: ${missingTables.join(", ")}`,
);

const relationshipQueries = [
  "/rest/v1/fact_venta?select=venta_id,dim_fecha(fecha_id),dim_producto(producto_id),dim_sucursal(sucursal_id),dim_canal(canal_id)&limit=0",
  "/rest/v1/fact_finanza?select=finanza_id,dim_fecha(fecha_id),dim_cuenta(cuenta_id),dim_escenario(escenario_id)&limit=0",
  "/rest/v1/fact_desempeno?select=desempeno_id,dim_fecha(fecha_id),dim_kpi(kpi_id),dim_unidad(unidad_id)&limit=0",
];
let validRelationships = 0;
for (const path of relationshipQueries) {
  const response = await fetch(new URL(path, url), {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (response.ok || [401, 403].includes(response.status)) validRelationships += 1;
}
record(
  "Relaciones estrella",
  validRelationships === relationshipQueries.length,
  `${validRelationships}/${relationshipQueries.length} grupos de relaciones detectados`,
);

await databaseCheck("PostgreSQL pooler", process.env.DATABASE_URL);
await databaseCheck("PostgreSQL directo", process.env.DIRECT_URL);

const failed = results.filter((result) => !result.ok);
console.log(`RESULTADO: ${results.length - failed.length}/${results.length} comprobaciones correctas`);
process.exit(failed.length ? 1 : 0);
