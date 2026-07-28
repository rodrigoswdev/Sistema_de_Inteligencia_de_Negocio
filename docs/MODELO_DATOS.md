# Modelo de datos

El modelo combina tablas operacionales con tres estrellas analíticas.

- Ventas: `fact_venta` con fecha, producto, sucursal, canal y empleado.
- Finanzas: `fact_finanza` con fecha, cuenta, centro de costo, sucursal y
  escenario.
- Desempeño: `fact_desempeno` con fecha, KPI, unidad y empleado.

Las cargas se registran en `carga_dato`; los rechazos se guardan en
`error_carga`. El catálogo configurable usa `kpi_definicion` y `kpi_umbral`.
Alertas, reportes, programaciones y bitácora completan el modelo operacional.

El contrato ORM está en `prisma/schema.prisma`. La migración ejecutable para
Supabase, que además contiene Auth y RLS, está en
`supabase/migrations/202607260001_sibi_cbn.sql`.
