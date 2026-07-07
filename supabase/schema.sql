-- =====================================================================
--  KAIROS FROTA — ERP de Gestão de Frotas
--  Schema Supabase (Postgres) — reproduzível em qualquer ambiente
--  Execute no SQL Editor do Supabase (uma vez).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tabela de estado da aplicação
--    O app persiste cada "domínio" (vehicles, fuel, plans, ...) como um
--    documento jsonb, isolado por org_id (= auth.uid() do usuário).
--    Modelo simples, robusto e 100% compatível com a camada src/lib/data.js.
-- ---------------------------------------------------------------------
create table if not exists public.app_state (
  org_id     uuid        not null,
  domain     text        not null,
  value      jsonb       not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (org_id, domain)
);

comment on table public.app_state is 'Estado do ERP Kairos Frota por organização/usuário e domínio.';

-- Índices
create index if not exists app_state_org_idx    on public.app_state (org_id);
create index if not exists app_state_domain_idx on public.app_state (domain);
create index if not exists app_state_updated_idx on public.app_state (updated_at desc);

-- ---------------------------------------------------------------------
-- 2) Trigger de updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated on public.app_state;
create trigger trg_app_state_updated
  before update on public.app_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3) Row Level Security (RLS)
--    Cada usuário só enxerga e grava o próprio org_id (= auth.uid()).
--    Para multiempresa real, troque auth.uid() por um org_id em
--    auth.jwt() -> user_metadata.
-- ---------------------------------------------------------------------
alter table public.app_state enable row level security;

drop policy if exists app_state_select on public.app_state;
create policy app_state_select on public.app_state
  for select using (org_id = auth.uid());

drop policy if exists app_state_insert on public.app_state;
create policy app_state_insert on public.app_state
  for insert with check (org_id = auth.uid());

drop policy if exists app_state_update on public.app_state;
create policy app_state_update on public.app_state
  for update using (org_id = auth.uid()) with check (org_id = auth.uid());

drop policy if exists app_state_delete on public.app_state;
create policy app_state_delete on public.app_state
  for delete using (org_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4) View de conveniência: último update por domínio
-- ---------------------------------------------------------------------
create or replace view public.v_app_state_resumo as
  select org_id, domain, jsonb_array_length(
           case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end
         ) as itens, updated_at
  from public.app_state;

-- =====================================================================
--  FIM DO SCHEMA
-- =====================================================================
