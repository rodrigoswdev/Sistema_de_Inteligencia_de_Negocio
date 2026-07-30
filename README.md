# SIBI CBN

Sistema Integral de Business Intelligence para análisis ejecutivo de ventas,
finanzas y desempeño organizacional. Esta versión implementa la arquitectura
definida en `Diseno_Integral_Sistema_BI_CBN.docx`.

> Los datos incluidos en modo demostración son simulados y no representan
> información interna de Cervecería Boliviana Nacional.

## Arquitectura

- Next.js App Router, React y TypeScript estricto.
- Tailwind CSS y componentes responsive.
- API Route Handlers dentro de la misma aplicación.
- Prisma ORM sobre PostgreSQL de Supabase.
- Supabase Auth, Storage y Row Level Security.
- Modelo estrella para ventas, finanzas y desempeño.

## Ejecutar el sistema

Requiere Node.js 20.9 o superior.

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

En el modo predeterminado no necesita una base de datos:

- Correo: `admin@cbn.local`
- Contraseña: `Password123`

También existen `analista@cbn.local`, `gerencia@cbn.local`,
`ventas@cbn.local`, `finanzas@cbn.local`, `desempeno@cbn.local` y
`auditor@cbn.local`, todos con la misma contraseña de demostración.

## Conectar Supabase

El SQL completo está en
`supabase/migrations/202607260001_sibi_cbn.sql`. Siga
`docs/SUPABASE.md`, copie las credenciales en `.env` y cambie
`DEMO_MODE=false`.

Nunca comparta públicamente `DATABASE_URL`, `DIRECT_URL`, la contraseña de la
base o una `service_role key`. La Project URL y la publishable key sí están
diseñadas para el cliente.

## Validación

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Directorios

```text
app/                 pantallas y API del App Router
components/          interfaz reutilizable
lib/auth/            sesión, Supabase y autorización
lib/services/        lógica analítica
lib/repositories/    acceso a usuarios y datos
lib/kpi/             fórmulas y semáforos
lib/validators/      contratos Zod
prisma/              modelo ORM
supabase/migrations/ SQL instalable, funciones y RLS
scripts/seed/        datos maestros
tests/               pruebas unitarias
docs/                guías técnicas y de usuario

```
