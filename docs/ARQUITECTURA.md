# Arquitectura SIBI CBN 2.0

La solución es una aplicación modular Next.js. Las páginas del App Router y
los Route Handlers comparten contratos TypeScript, sesión y servicios, por lo
que no se duplica lógica entre un frontend y un backend separados.

## Capas

1. `app/`: presentación web y endpoints HTTP.
2. `components/`: componentes visuales y dashboard.
3. `lib/auth` y `proxy.ts`: autenticación, sesión, roles y protección.
4. `lib/services`: casos de uso y agregaciones analíticas.
5. `lib/repositories`: acceso desacoplado a datos.
6. `lib/kpi` y `lib/validators`: reglas deterministas y validación.
7. Prisma/Supabase: persistencia, Auth, Storage y RLS.

## Flujo de datos

```text
CSV/XLSX → validación → carga_dato/error_carga → dimensiones y hechos
        → servicios KPI → API estándar → dashboard/reporte/alerta
```

Todas las respuestas API incluyen `data`, `meta`, `message`, `errors` y
`requestId`. El modo demo usa un repositorio determinista; el modo productivo
utiliza Supabase sin exponer credenciales de servidor al navegador.

## Seguridad

- Cookie de sesión `HttpOnly`, `SameSite=Lax` y firmada.
- Supabase Auth en modo conectado.
- Protección de página y API según rol.
- RLS en datos sensibles y consultas por ámbito funcional.
- Auditoría para accesos, cargas, cambios y exportaciones.
- `service_role`, `DATABASE_URL` y `DIRECT_URL` solo en servidor.
