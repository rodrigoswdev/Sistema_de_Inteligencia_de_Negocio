-- SIBI CBN 2.0 · Esquema inicial para Supabase PostgreSQL
-- Ejecutar completo desde SQL Editor. Es idempotente para tipos y datos maestros.
create extension if not exists pgcrypto;

do $$ begin create type public.estado_general as enum ('ACTIVO','INACTIVO'); exception when duplicate_object then null; end $$;
do $$ begin create type public.modulo as enum ('VENTAS','FINANZAS','DESEMPENO','EJECUTIVO','DATOS'); exception when duplicate_object then null; end $$;
do $$ begin create type public.estado_carga as enum ('REGISTRADA','VALIDANDO','CON_ERRORES','TRANSFORMANDO','COMPLETADA','FALLIDA','CANCELADA'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sentido_kpi as enum ('MAYOR_MEJOR','MENOR_MEJOR','RANGO','INFORMATIVO'); exception when duplicate_object then null; end $$;
do $$ begin create type public.nivel_semaforo as enum ('VERDE','AMARILLO','ROJO','NEUTRO'); exception when duplicate_object then null; end $$;
do $$ begin create type public.severidad as enum ('CRITICA','ALTA','MEDIA','BAJA'); exception when duplicate_object then null; end $$;
do $$ begin create type public.estado_alerta as enum ('ABIERTA','ATENDIDA','CERRADA'); exception when duplicate_object then null; end $$;

create table if not exists public.rol (
  id smallserial primary key, nombre varchar(50) not null unique, descripcion varchar(250)
);
create table if not exists public.usuario (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email varchar(180) not null unique,
  nombre varchar(150) not null,
  estado public.estado_general not null default 'ACTIVO',
  ultimo_acceso timestamptz,
  creado_en timestamptz not null default now()
);
create table if not exists public.usuario_rol (
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  rol_id smallint not null references public.rol(id),
  asignado_en timestamptz not null default now(),
  primary key (usuario_id, rol_id)
);

create table if not exists public.fuente_dato (
  id bigserial primary key, nombre varchar(120) not null unique, tipo varchar(30) not null,
  modulo public.modulo not null, frecuencia varchar(30), estado public.estado_general not null default 'ACTIVO',
  configuracion_json jsonb
);
create table if not exists public.carga_dato (
  id uuid primary key default gen_random_uuid(),
  fuente_id bigint not null references public.fuente_dato(id),
  modulo public.modulo not null, periodo varchar(20) not null, archivo varchar(255),
  storage_path varchar(500), checksum varchar(128),
  datos_origen jsonb,
  estado public.estado_carga not null default 'REGISTRADA',
  filas_totales integer not null default 0 check (filas_totales >= 0),
  filas_validas integer not null default 0 check (filas_validas >= 0),
  filas_error integer not null default 0 check (filas_error >= 0),
  iniciado_por uuid not null references public.usuario(id),
  fecha_inicio timestamptz not null default now(), fecha_fin timestamptz,
  check (filas_validas + filas_error <= filas_totales)
);
create index if not exists carga_modulo_periodo_idx on public.carga_dato(modulo, periodo);
alter table public.carga_dato
  add column if not exists datos_origen jsonb;
create table if not exists public.error_carga (
  id bigserial primary key, carga_id uuid not null references public.carga_dato(id) on delete cascade,
  numero_fila integer, campo varchar(80), codigo_error varchar(40) not null,
  mensaje varchar(500) not null, valor_original text
);

create table if not exists public.dim_fecha (
  fecha_id integer primary key, fecha date not null unique, dia smallint not null,
  mes smallint not null, nombre_mes varchar(15) not null, trimestre smallint not null,
  anio smallint not null, es_cierre_mes boolean not null default false
);
create table if not exists public.dim_producto (
  producto_id bigserial primary key, codigo varchar(30) not null unique, nombre varchar(120) not null,
  categoria varchar(80) not null, marca varchar(80), presentacion varchar(80),
  estado public.estado_general not null default 'ACTIVO', vigente_desde date not null default current_date,
  vigente_hasta date
);
create table if not exists public.dim_sucursal (
  sucursal_id bigserial primary key, codigo varchar(30) not null unique, nombre varchar(120) not null,
  region varchar(80) not null, ciudad varchar(80), estado public.estado_general not null default 'ACTIVO'
);
create table if not exists public.dim_canal (
  canal_id bigserial primary key, codigo varchar(30) not null unique, nombre varchar(100) not null, tipo varchar(50)
);
create table if not exists public.dim_empleado (
  empleado_id bigserial primary key, codigo varchar(30) not null unique, nombre varchar(120) not null,
  cargo varchar(100), unidad varchar(100), estado public.estado_general not null default 'ACTIVO'
);
create table if not exists public.dim_cuenta (
  cuenta_id bigserial primary key, codigo varchar(30) not null unique, nombre varchar(150) not null,
  tipo varchar(30) not null, nivel smallint not null, cuenta_padre_id bigint references public.dim_cuenta(cuenta_id)
);
create table if not exists public.dim_centro_costo (
  centro_costo_id bigserial primary key, codigo varchar(30) not null unique, nombre varchar(120) not null,
  unidad varchar(100), responsable varchar(120)
);
create table if not exists public.dim_escenario (
  escenario_id smallserial primary key, codigo varchar(20) not null unique, nombre varchar(60) not null
);
create table if not exists public.dim_unidad (
  unidad_id bigserial primary key, codigo varchar(30) not null unique, nombre varchar(120) not null,
  responsable varchar(120), estado public.estado_general not null default 'ACTIVO'
);
create table if not exists public.dim_kpi (
  kpi_id bigserial primary key, codigo varchar(40) not null unique, nombre varchar(150) not null,
  modulo public.modulo not null, unidad_medida varchar(30) not null, sentido public.sentido_kpi not null,
  activo boolean not null default true
);

create table if not exists public.fact_venta (
  venta_id bigserial primary key,
  fecha_id integer not null references public.dim_fecha(fecha_id),
  producto_id bigint not null references public.dim_producto(producto_id),
  sucursal_id bigint not null references public.dim_sucursal(sucursal_id),
  canal_id bigint not null references public.dim_canal(canal_id),
  empleado_id bigint references public.dim_empleado(empleado_id) on delete set null,
  documento varchar(50) not null, cantidad numeric(18,3) not null,
  venta_bruta numeric(18,2) not null, descuento numeric(18,2) not null default 0,
  devolucion numeric(18,2) not null default 0, venta_neta numeric(18,2) not null,
  costo numeric(18,2) not null, margen numeric(18,2) not null,
  meta_venta numeric(18,2) not null default 0,
  carga_id uuid not null references public.carga_dato(id),
  unique(documento, producto_id)
);
create index if not exists fact_venta_fecha_sucursal_idx on public.fact_venta(fecha_id, sucursal_id, canal_id);
create table if not exists public.fact_finanza (
  finanza_id bigserial primary key,
  fecha_id integer not null references public.dim_fecha(fecha_id),
  cuenta_id bigint not null references public.dim_cuenta(cuenta_id),
  centro_costo_id bigint references public.dim_centro_costo(centro_costo_id) on delete set null,
  sucursal_id bigint references public.dim_sucursal(sucursal_id) on delete set null,
  escenario_id smallint not null references public.dim_escenario(escenario_id),
  importe numeric(18,2) not null, debito numeric(18,2) not null default 0,
  credito numeric(18,2) not null default 0, carga_id uuid not null references public.carga_dato(id)
);
create index if not exists fact_finanza_fecha_escenario_idx on public.fact_finanza(fecha_id, escenario_id);
create table if not exists public.fact_desempeno (
  desempeno_id bigserial primary key,
  fecha_id integer not null references public.dim_fecha(fecha_id),
  kpi_id bigint not null references public.dim_kpi(kpi_id),
  unidad_id bigint not null references public.dim_unidad(unidad_id),
  empleado_id bigint references public.dim_empleado(empleado_id) on delete set null,
  valor_meta numeric(18,4) not null, valor_real numeric(18,4) not null,
  cumplimiento numeric(9,4) not null, estado public.nivel_semaforo not null,
  carga_id uuid not null references public.carga_dato(id),
  unique(fecha_id, kpi_id, unidad_id)
);

create table if not exists public.kpi_definicion (
  id bigserial primary key, codigo varchar(40) not null unique, nombre varchar(150) not null,
  modulo public.modulo not null, formula text not null, unidad varchar(30) not null,
  sentido public.sentido_kpi not null, periodicidad varchar(20) not null,
  meta numeric(18,4), activo boolean not null default true,
  creado_por uuid not null references public.usuario(id), creado_en timestamptz not null default now()
);
create table if not exists public.kpi_umbral (
  id bigserial primary key, kpi_id bigint not null references public.kpi_definicion(id) on delete cascade,
  nivel public.nivel_semaforo not null, valor_desde numeric(18,4), valor_hasta numeric(18,4),
  color_tailwind varchar(80) not null, vigente_desde date not null default current_date,
  unique(kpi_id, nivel, vigente_desde)
);
create table if not exists public.alerta (
  id bigserial primary key, kpi_id bigint references public.kpi_definicion(id) on delete set null,
  periodo varchar(20) not null, severidad public.severidad not null, mensaje varchar(500) not null,
  estado public.estado_alerta not null default 'ABIERTA',
  responsable_id uuid references public.usuario(id) on delete set null,
  creada_en timestamptz not null default now(), atendida_en timestamptz, comentario text
);
create table if not exists public.reporte (
  id bigserial primary key, nombre varchar(150) not null, tipo varchar(30) not null,
  configuracion_json jsonb not null default '{}'::jsonb, creado_por uuid not null references public.usuario(id),
  estado public.estado_general not null default 'ACTIVO', creado_en timestamptz not null default now()
);
create table if not exists public.reporte_programado (
  id bigserial primary key, reporte_id bigint not null references public.reporte(id) on delete cascade,
  frecuencia varchar(40) not null, destinatarios text not null,
  proxima_ejecucion timestamptz not null, activo boolean not null default true
);
create table if not exists public.bitacora (
  id bigserial primary key, usuario_id uuid references public.usuario(id) on delete set null,
  accion varchar(80) not null, entidad varchar(80) not null, entidad_id varchar(80),
  fecha timestamptz not null default now(), resultado varchar(20) not null,
  detalle_json jsonb, ip_hash varchar(128)
);
create index if not exists bitacora_usuario_fecha_idx on public.bitacora(usuario_id, fecha desc);

-- Crea el perfil local cada vez que Supabase Auth registra una cuenta.
create or replace function public.crear_perfil_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.usuario(auth_user_id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (auth_user_id) do nothing;
  return new;
end $$;
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'al_crear_usuario_auth'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger al_crear_usuario_auth
    after insert on auth.users
    for each row execute procedure public.crear_perfil_usuario();
  end if;
end $$;

create or replace function public.es_rol(roles_requeridos text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.usuario u
    join public.usuario_rol ur on ur.usuario_id = u.id
    join public.rol r on r.id = ur.rol_id
    where u.auth_user_id = auth.uid() and r.nombre = any(roles_requeridos) and u.estado = 'ACTIVO'
  );
$$;

create or replace function public.mis_roles()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(r.nombre order by r.nombre), array[]::text[])
  from public.usuario u
  join public.usuario_rol ur on ur.usuario_id = u.id
  join public.rol r on r.id = ur.rol_id
  where u.auth_user_id = auth.uid() and u.estado = 'ACTIVO';
$$;
grant execute on function public.mis_roles() to authenticated;

-- RLS: todas las tablas creadas quedan protegidas.
alter table public.rol enable row level security;
alter table public.usuario enable row level security;
alter table public.usuario_rol enable row level security;
alter table public.fuente_dato enable row level security;
alter table public.carga_dato enable row level security;
alter table public.error_carga enable row level security;
alter table public.dim_fecha enable row level security;
alter table public.dim_producto enable row level security;
alter table public.dim_sucursal enable row level security;
alter table public.dim_canal enable row level security;
alter table public.dim_empleado enable row level security;
alter table public.dim_cuenta enable row level security;
alter table public.dim_centro_costo enable row level security;
alter table public.dim_escenario enable row level security;
alter table public.dim_unidad enable row level security;
alter table public.dim_kpi enable row level security;
alter table public.fact_venta enable row level security;
alter table public.fact_finanza enable row level security;
alter table public.fact_desempeno enable row level security;
alter table public.kpi_definicion enable row level security;
alter table public.kpi_umbral enable row level security;
alter table public.alerta enable row level security;
alter table public.reporte enable row level security;
alter table public.reporte_programado enable row level security;
alter table public.bitacora enable row level security;

-- Catálogos y dimensiones: lectura para usuarios autenticados.
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'rol', 'fuente_dato', 'dim_fecha', 'dim_producto', 'dim_sucursal',
    'dim_canal', 'dim_empleado', 'dim_cuenta', 'dim_centro_costo',
    'dim_escenario', 'dim_unidad', 'dim_kpi', 'kpi_definicion',
    'kpi_umbral', 'reporte', 'reporte_programado'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tabla
        and policyname = 'lectura autenticada'
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (true)',
        'lectura autenticada',
        tabla
      );
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuario'
      and policyname = 'perfil propio o administracion'
  ) then
    create policy "perfil propio o administracion"
    on public.usuario for select to authenticated
    using (auth_user_id = auth.uid() or public.es_rol(array['ADMINISTRADOR','AUDITOR']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usuario_rol'
      and policyname = 'roles propios o administracion'
  ) then
    create policy "roles propios o administracion"
    on public.usuario_rol for select to authenticated
    using (
      exists (
        select 1 from public.usuario u
        where u.id = usuario_id and u.auth_user_id = auth.uid()
      )
      or public.es_rol(array['ADMINISTRADOR','AUDITOR'])
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fact_venta'
      and policyname = 'bi lectura ventas'
  ) then
    create policy "bi lectura ventas"
    on public.fact_venta for select to authenticated
    using (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI','VENTAS','GERENCIA','AUDITOR']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fact_finanza'
      and policyname = 'bi lectura finanzas'
  ) then
    create policy "bi lectura finanzas"
    on public.fact_finanza for select to authenticated
    using (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI','FINANZAS','GERENCIA','AUDITOR']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fact_desempeno'
      and policyname = 'bi lectura desempeno'
  ) then
    create policy "bi lectura desempeno"
    on public.fact_desempeno for select to authenticated
    using (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI','DESEMPENO','GERENCIA','AUDITOR']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'carga_dato'
      and policyname = 'bi gestiona cargas'
  ) then
    create policy "bi gestiona cargas"
    on public.carga_dato for all to authenticated
    using (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI']))
    with check (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'error_carga'
      and policyname = 'bi consulta errores'
  ) then
    create policy "bi consulta errores"
    on public.error_carga for select to authenticated
    using (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI','AUDITOR']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alerta'
      and policyname = 'alertas autorizadas'
  ) then
    create policy "alertas autorizadas"
    on public.alerta for all to authenticated
    using (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI','GERENCIA','AUDITOR']))
    with check (public.es_rol(array['ADMINISTRADOR','ANALISTA_BI']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'bitacora'
      and policyname = 'auditoria lectura'
  ) then
    create policy "auditoria lectura"
    on public.bitacora for select to authenticated
    using (public.es_rol(array['ADMINISTRADOR','AUDITOR']));
  end if;
end $$;

insert into public.rol(nombre, descripcion) values
('ADMINISTRADOR','Configuración y seguridad'),
('ANALISTA_BI','Integración, KPI y análisis'),
('VENTAS','Consulta del módulo comercial'),
('FINANZAS','Consulta del módulo financiero'),
('DESEMPENO','Consulta del desempeño organizacional'),
('GERENCIA','Visión ejecutiva y reportes'),
('AUDITOR','Consulta de trazabilidad')
on conflict (nombre) do update set descripcion = excluded.descripcion;

insert into public.dim_escenario(codigo,nombre) values
('REAL','Real'),('PRESUPUESTO','Presupuesto')
on conflict (codigo) do update set nombre = excluded.nombre;

insert into public.dim_canal(codigo,nombre,tipo) values
('TRAD','Tradicional','COMERCIAL'),('MOD','Moderno','COMERCIAL'),('DIST','Distribuidor','COMERCIAL')
on conflict (codigo) do update set nombre = excluded.nombre;

insert into public.fuente_dato(nombre,tipo,modulo,frecuencia,configuracion_json) values
('Ventas CSV','CSV','VENTAS','MENSUAL','{"delimiter":",","encoding":"UTF-8"}'::jsonb),
('Contabilidad Excel','EXCEL','FINANZAS','MENSUAL','{"sheet":"Movimientos"}'::jsonb),
('Metas organizacionales','EXCEL','DESEMPENO','TRIMESTRAL','{"sheet":"Metas"}'::jsonb)
on conflict (nombre) do update set
  tipo = excluded.tipo,
  modulo = excluded.modulo,
  frecuencia = excluded.frecuencia,
  configuracion_json = excluded.configuracion_json;

-- Las dimensiones se exponen a usuarios autenticados; las escrituras se realizan desde el servidor.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
