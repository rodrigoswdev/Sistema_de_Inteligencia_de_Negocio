# Migraciones

La migración inicial se mantiene en `supabase/migrations/202607260001_sibi_cbn.sql`
porque incluye objetos propios de Supabase (`auth.users`, RLS y políticas).

Ejecutar desde Supabase SQL Editor o con:

```powershell
npx prisma db execute --file supabase/migrations/202607260001_sibi_cbn.sql
```
