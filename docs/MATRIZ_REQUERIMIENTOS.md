# Matriz de requerimientos funcionales

Fuente: `Diseno_Integral_Sistema_BI_CBN.docx`.

| ID | Requerimiento | Implementación | Estado |
| --- | --- | --- | --- |
| RF-01 | Autenticar usuarios y cerrar sesión de forma segura | Supabase Auth, cookie HttpOnly firmada, logout local/remoto y bitácora | Implementado |
| RF-02 | Gestionar usuarios, roles, estados y alcance | `/administracion`, APIs `/api/admin/users`, `/api/admin/roles`, Prisma y Supabase Admin | Implementado; requiere service-role key y contraseña PostgreSQL válidas |
| RF-03 | Registrar y configurar fuentes de datos | `/fuentes`, API CRUD, validación Zod, Prisma y auditoría | Implementado; requiere contraseña PostgreSQL válida |
| RF-04 | Importar ventas | Plantilla, lectura CSV, validación y ETL a producto, sucursal, canal, empleado y `fact_venta` | Implementado |
| RF-05 | Importar finanzas y presupuesto | Plantilla, escenarios, cuentas, centros de costo y `fact_finanza` | Implementado |
| RF-06 | Importar metas y desempeño | Plantilla, KPI, unidades, cumplimiento, semáforo y `fact_desempeno` | Implementado |
| RF-07 | Validar estructura y reglas | Columnas, obligatorios, fechas, números, rangos, catálogos y claves duplicadas | Implementado |
| RF-08 | Historial, errores y reintentos | `carga_dato`, `error_carga`, datos de origen, detalle y reintento | Implementado |
| RF-09 | Transformar a dimensiones y hechos | Consolidación Prisma transaccional e idempotente por claves de negocio | Implementado |
| RF-10 | Calcular KPI y semáforos | Ventas, margen, crecimiento, ticket, EBITDA, presupuesto, cumplimiento y calidad reales | Implementado |
| RF-11 | Dashboard de ventas | `fact_venta`, dimensiones, filtros, KPI, tendencias y detalle | Implementado |
| RF-12 | Dashboard financiero | `fact_finanza`, escenarios, estado resumido y centros de costo | Implementado |
| RF-13 | Dashboard de desempeño | `fact_desempeno`, ranking, matriz y umbrales | Implementado |
| RF-14 | Dashboard ejecutivo | Consolidación de los tres módulos y semáforo corporativo | Implementado |
| RF-15 | Estado de actualización | Última carga y fuente visible: Supabase, demo o respaldo | Implementado |
| RF-16 | Configurar KPI y umbrales | CRUD de definiciones, meta, sentido, periodicidad y tres niveles de semáforo | Implementado |
| RF-17 | Generar alertas | Evaluación de desempeño/calidad, deduplicación y ejecución posterior a una carga | Implementado |
| RF-18 | Gestionar alertas | Bandeja real, atención, cierre, responsable, comentario y auditoría | Implementado |
| RF-19 | Generar reportes filtrados | Configuración persistida por módulo, formato, fechas y dimensión | Implementado |
| RF-20 | Exportar reportes | PDF y Excel reciben módulo y filtros; descarga registrada en bitácora | Implementado |
| RF-21 | Programar reportes | Frecuencia, destinatarios, próxima ejecución y ejecutor de vencimientos | Implementado |
| RF-22 | Drill-down | Navegación desde producto/unidad al detalle y API especializada | Implementado |
| RF-23 | Auditoría | Bitácora real, pantalla de solo lectura y acciones críticas registradas | Implementado |
| RF-24 | Permisos por rol | Matriz única compartida por proxy, navegación y administración | Implementado |
| RF-25 | Recalcular después de carga | Invalidación de dashboards, KPI sobre hechos y reevaluación de alertas | Implementado |

## Prueba acumulada RF-01 a RF-09

Prueba HTTP controlada:

```text
RF01_LOGIN=200 LOGOUT=200
RF02_USERS=200 ROLES=200
RF03_SOURCES=200 CREATE=200
```

Validaciones:

- TypeScript estricto: aprobado.
- ESLint: aprobado.
- Vitest: incluye parser CSV, reglas de carga, fórmulas KPI y filtros analíticos.
- Next.js: incluye historial, plantillas y reintentos de cargas.

## Formato de archivos

Desde `/cargas` se descarga una plantilla CSV UTF-8 diferente para cada módulo.
El lector XLSX quedó previsto, pero su paquete externo no pudo descargarse por
la conexión del entorno. Mientras se completa esa instalación, los archivos de
Excel deben guardarse como CSV UTF-8.

## Configuración externa pendiente

Para aprobar RF-02/RF-03 en Supabase productivo:

1. Corregir la contraseña de `DATABASE_URL` y `DIRECT_URL`.
2. Agregar `SUPABASE_SERVICE_ROLE_KEY` directamente en `.env`.
3. Ejecutar `npm.cmd run supabase:verify` hasta obtener todas las conexiones
   correctas.

## Extensiones de administración

- Copias de seguridad configurables desde `/auditoria`: frecuencia diaria,
  semanal o mensual, hora, retención, auditoría opcional, ejecución manual,
  historial y descarga.
- Archivos comprimidos GZIP con checksum SHA-256 en el bucket privado
  `system-backups`.
- Exportaciones PDF multipágina con cabecera corporativa, tablas y numeración.
- Exportaciones Excel con título, metadatos, estilos, anchos, filas alternadas,
  filtros y panel inmovilizado.
