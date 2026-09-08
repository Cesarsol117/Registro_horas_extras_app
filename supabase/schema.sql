-- ============================================================================
-- Schema de la app de horas extras — pegar y correr en el SQL Editor de Supabase
-- Dashboard -> SQL Editor -> New query -> pegar todo -> Run
--
-- Este script crea 5 tablas, las polizas de Row Level Security (RLS) para
-- que cada usuario vea solo sus datos, y un trigger que autocompleta el
-- user_id en cada INSERT.
-- ============================================================================

-- ------------------- Extensiones (por si no vienen ya)
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) COLABORADOR — datos personales (uno por usuario)
-- ============================================================================
create table if not exists public.colaborador (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  codigo_meta4 text default '',
  cedula text default '',
  nombre text default '',
  compania text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- ============================================================================
-- 2) REGISTROS de horas extras
-- ============================================================================
create table if not exists public.registros (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  inicio time not null,
  fin time not null,
  tipo text not null check (tipo in (
    'diurna', 'nocturna', 'recargo_nocturno', 'recargo_festivo',
    'recargo_nocturno_festivo', 'dominical', 'festiva', 'nocturna_festiva'
  )),
  observacion text default '',
  created_at timestamptz default now()
);
create index if not exists idx_registros_user_fecha on public.registros (user_id, fecha);

-- ============================================================================
-- 3) SALARIOS mensuales
-- ============================================================================
create table if not exists public.salarios (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mes text not null,  -- 'YYYY-MM'
  salario numeric(12,2) not null,
  created_at timestamptz default now(),
  unique (user_id, mes)
);

-- ============================================================================
-- 4) RECARGOS variables por tipo con vigencia
-- ============================================================================
create table if not exists public.recargos (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in (
    'diurna', 'nocturna', 'recargo_nocturno', 'recargo_festivo',
    'recargo_nocturno_festivo', 'dominical', 'festiva', 'nocturna_festiva'
  )),
  porcentaje numeric(5,4) not null,  -- 0.25 = 25%
  vigente_desde date not null,
  observacion text default '',
  created_at timestamptz default now(),
  unique (user_id, tipo, vigente_desde)
);
create index if not exists idx_recargos_user_tipo_fecha
  on public.recargos (user_id, tipo, vigente_desde desc);

-- ============================================================================
-- 5) PRECIOS MANUALES (override por mes+tipo)
-- ============================================================================
create table if not exists public.precios_manuales (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mes text not null,
  tipo text not null check (tipo in (
    'diurna', 'nocturna', 'recargo_nocturno', 'recargo_festivo',
    'recargo_nocturno_festivo', 'dominical', 'festiva', 'nocturna_festiva'
  )),
  valor numeric(12,2) not null,
  created_at timestamptz default now(),
  unique (user_id, mes, tipo)
);

-- ============================================================================
-- TRIGGER: autocompletar user_id con auth.uid() en cada INSERT.
-- Asi el cliente no necesita pasar user_id explicitamente y RLS igual protege.
-- ============================================================================
create or replace function public.set_user_id()
returns trigger language plpgsql as $$
begin
  if NEW.user_id is null then
    NEW.user_id := auth.uid();
  end if;
  return NEW;
end $$;

do $$ begin
  drop trigger if exists trg_set_user_id_colaborador on public.colaborador;
  create trigger trg_set_user_id_colaborador before insert on public.colaborador
    for each row execute function public.set_user_id();

  drop trigger if exists trg_set_user_id_registros on public.registros;
  create trigger trg_set_user_id_registros before insert on public.registros
    for each row execute function public.set_user_id();

  drop trigger if exists trg_set_user_id_salarios on public.salarios;
  create trigger trg_set_user_id_salarios before insert on public.salarios
    for each row execute function public.set_user_id();

  drop trigger if exists trg_set_user_id_recargos on public.recargos;
  create trigger trg_set_user_id_recargos before insert on public.recargos
    for each row execute function public.set_user_id();

  drop trigger if exists trg_set_user_id_precios on public.precios_manuales;
  create trigger trg_set_user_id_precios before insert on public.precios_manuales
    for each row execute function public.set_user_id();
end $$;

-- ============================================================================
-- ROW LEVEL SECURITY — cada usuario ve/edita SOLO sus filas
-- ============================================================================
alter table public.colaborador enable row level security;
alter table public.registros enable row level security;
alter table public.salarios enable row level security;
alter table public.recargos enable row level security;
alter table public.precios_manuales enable row level security;

-- Helper para no repetir 5 veces las 4 policies:
-- (SELECT, INSERT, UPDATE, DELETE, todas restringidas al user_id = auth.uid())

do $$
declare
  t text;
begin
  foreach t in array array['colaborador','registros','salarios','recargos','precios_manuales'] loop
    execute format('drop policy if exists sel on public.%I;', t);
    execute format('drop policy if exists ins on public.%I;', t);
    execute format('drop policy if exists upd on public.%I;', t);
    execute format('drop policy if exists del on public.%I;', t);

    execute format($f$create policy sel on public.%I for select using (user_id = auth.uid());$f$, t);
    execute format($f$create policy ins on public.%I for insert with check (user_id = auth.uid() or auth.uid() is not null);$f$, t);
    execute format($f$create policy upd on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
    execute format($f$create policy del on public.%I for delete using (user_id = auth.uid());$f$, t);
  end loop;
end $$;

-- ============================================================================
-- LISTO. Cerrar el script.
-- Los recargos por defecto (0.25 diurna, 0.75 nocturna, etc.) no se siembran
-- aqui — el cliente cae a valores por defecto (Utils.TIPOS_HORA) mientras
-- el usuario no cree ninguno propio.
-- ============================================================================
