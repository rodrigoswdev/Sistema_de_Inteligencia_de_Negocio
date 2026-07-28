# Configurar Supabase

## 1. Crear el proyecto

1. Ingrese a Supabase y cree un proyecto.
2. Guarde la contraseña de la base de datos.
3. Espere a que el proyecto quede en estado disponible.

## 2. Crear el esquema

1. Abra **SQL Editor**.
2. Cree una consulta nueva.
3. Copie todo el contenido de
   `supabase/migrations/202607260001_sibi_cbn.sql`.
4. Pulse **Run** una sola vez.
5. En **Table Editor** compruebe que existan `usuario`, `rol`,
   `fact_venta`, `fact_finanza`, `fact_desempeno`, `carga_dato`,
   `kpi_definicion`, `alerta`, `reporte` y `bitacora`.

El script instala extensiones, tipos, tablas, índices, función de creación de
perfil, roles iniciales y políticas RLS. Puede volver a ejecutarse para los
datos maestros, pero no debe usarse como mecanismo para borrar datos.

## 3. Obtener los valores de conexión

En **Project Settings → API** copie:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable/anon key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret/service role key → `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)

En **Project Settings → Database → Connect** copie:

- Transaction pooler → `DATABASE_URL`
- Session pooler o conexión directa → `DIRECT_URL`

Supabase puede mostrar una cadena con `[YOUR-PASSWORD]`; reemplace solamente
ese texto por la contraseña real. Si la contraseña contiene símbolos, use su
representación URL-encoded.

## 4. Configurar el proyecto local

Desde la raíz:

```powershell
Copy-Item .env.example .env
```

Edite `.env`, pegue los cuatro valores anteriores, establezca un
`AUTH_SECRET` largo y cambie:

```env
DEMO_MODE=false
```

No envíe el archivo `.env` por chat ni lo publique en Git.
La clave `SUPABASE_SERVICE_ROLE_KEY` permite crear usuarios desde RF-02:
nunca debe llevar el prefijo `NEXT_PUBLIC_` ni utilizarse en componentes del
navegador.

## 5. Crear usuarios

1. Abra **Authentication → Users → Add user**.
2. Cree la cuenta indicando nombre en los metadatos.
3. El trigger SQL creará automáticamente el registro en `public.usuario`.
4. En SQL Editor asigne un rol:

```sql
insert into public.usuario_rol (usuario_id, rol_id)
select u.id, r.id
from public.usuario u
cross join public.rol r
where u.email = 'usuario@empresa.com'
  and r.nombre = 'GERENCIA'
on conflict do nothing;
```

Roles disponibles: `ADMINISTRADOR`, `ANALISTA_BI`, `VENTAS`, `FINANZAS`,
`DESEMPENO`, `GERENCIA` y `AUDITOR`.

## 6. Ejecutar y comprobar

```powershell
npm install
npm run db:generate
npm run dev
```

Abra `http://localhost:3000`, inicie sesión y compruebe:

- `/api/auth/me` devuelve el usuario activo.
- `/api/dashboard/executive` devuelve un sobre JSON estándar.
- El menú cambia según el rol.

## Qué debe proporcionar al desarrollador

Para conectar los archivos solo son necesarios la **Project URL** y la
**publishable key** en el cliente. La conexión del servidor también requiere
`DATABASE_URL` y `DIRECT_URL`; introdúzcalas directamente en `.env`. No es
necesario ni seguro pegarlas en una conversación.
