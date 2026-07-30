# Persistencia de KPIs - Configuración

## Problema Identificado

Los KPIs creados no persisten después de recargar la página porque la aplicación está configurada en modo demo por defecto.

## Causa

En el archivo `.env`, la variable `DEMO_MODE=true` hace que:
- Los KPIs se guarden en memoria (Map) en lugar de la base de datos
- Los datos se pierden al recargar la página o reiniciar el servidor
- Las operaciones CRUD usan datos temporales de demostración

## Solución

Para que los KPIs persistan en la base de datos:

1. **Configurar las variables de entorno de Supabase:**
   ```env
   DEMO_MODE=false
   DATABASE_URL=postgresql://postgres.SU_REFERENCIA:CONTRASENA@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.SU_REFERENCIA:CONTRASENA@aws-0-region.pooler.supabase.com:5432/postgres
   ```

2. **Ejecutar las migraciones de la base de datos:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Reiniciar el servidor de desarrollo**

## Verificación

Para verificar que está usando la base de datos real:
- Cree un KPI
- Recargue la página
- El KPI debería seguir apareciendo en la lista

## Modo Demo vs Producción

| Característica | Modo Demo (DEMO_MODE=true) | Modo Producción (DEMO_MODE=false) |
|---------------|----------------------------|-----------------------------------|
| Persistencia | Memoria temporal | Base de datos PostgreSQL |
| Reinicio servidor | Pierde datos | Mantiene datos |
| Recargar página | Pierde datos | Mantiene datos |
| Multi-usuario | Datos compartidos temporales | Datos persistentes por usuario |

## Correcciones Aplicadas

También se corrigieron otros problemas en el código:

1. **Error de hidratación en UserManager**: Se agregó `loading` al estado `disabled` para consistencia entre servidor y cliente
2. **Código duplicado en KpiManager**: Se eliminó la función `submit` duplicada que causaba errores
3. **URL incorrecta**: Se corrigió la URL de fetch de `/api/kpi` a `/api/kpis`
