-- SIBI CBN · Configuración e historial de copias de seguridad.
create table if not exists public.configuracion_copia (
  id smallint primary key default 1 check (id = 1),
  frecuencia varchar(20) not null default 'SEMANAL'
    check (frecuencia in ('DIARIA','SEMANAL','MENSUAL')),
  hora varchar(5) not null default '02:00'
    check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  dia_semana smallint check (dia_semana between 0 and 6),
  dia_mes smallint check (dia_mes between 1 and 28),
  retencion smallint not null default 12 check (retencion between 1 and 100),
  incluir_auditoria boolean not null default true,
  activo boolean not null default true,
  actualizado_por uuid references public.usuario(id) on delete set null,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.copia_seguridad (
  id uuid primary key default gen_random_uuid(),
  tipo varchar(20) not null,
  estado varchar(20) not null check (estado in ('EN_PROCESO','COMPLETADA','FALLIDA')),
  archivo varchar(255),
  storage_path varchar(500),
  tamano_bytes bigint check (tamano_bytes is null or tamano_bytes >= 0),
  checksum varchar(128),
  tablas smallint not null default 0,
  iniciado_por uuid references public.usuario(id) on delete set null,
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz,
  error text
);
create index if not exists copia_estado_fecha_idx
  on public.copia_seguridad(estado, iniciado_en desc);

insert into public.configuracion_copia(id)
values (1)
on conflict (id) do nothing;

alter table public.configuracion_copia enable row level security;
alter table public.copia_seguridad enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'configuracion_copia'
      and policyname = 'administracion copias'
  ) then
    create policy "administracion copias"
    on public.configuracion_copia for all to authenticated
    using (public.es_rol(array['ADMINISTRADOR']))
    with check (public.es_rol(array['ADMINISTRADOR']));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'copia_seguridad'
      and policyname = 'consulta copias'
  ) then
    create policy "consulta copias"
    on public.copia_seguridad for select to authenticated
    using (public.es_rol(array['ADMINISTRADOR','AUDITOR']));
  end if;
end $$;

grant select on public.configuracion_copia, public.copia_seguridad to authenticated;
