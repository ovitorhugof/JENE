-- JENE Gestão: módulo Campeonatos
-- Migração aditiva. Não remove tabelas nem dados existentes.
-- Execute no Supabase SQL Editor somente após revisar o projeto correto.

begin;

create table if not exists public.championships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  start_date date not null,
  end_date date,
  city text,
  location text,
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint championships_name_not_blank check (length(btrim(name)) > 0),
  constraint championships_type_check check (type in ('one_day', 'league', 'knockout', 'other')),
  constraint championships_status_check check (status in ('planned', 'ongoing', 'finished', 'cancelled')),
  constraint championships_date_range_check check (end_date is null or end_date >= start_date)
);

create table if not exists public.championship_categories (
  id uuid primary key default gen_random_uuid(),
  championship_id uuid not null references public.championships(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint championship_categories_unique unique (championship_id, category_id)
);

alter table public.matches add column if not exists championship_id uuid;
alter table public.matches add column if not exists stage text;
alter table public.matches add column if not exists round_name text;
alter table public.matches add column if not exists round_number integer;
alter table public.matches add column if not exists jene_score integer;
alter table public.matches add column if not exists opponent_score integer;
alter table public.matches add column if not exists match_status text;

update public.matches set match_status = 'scheduled' where match_status is null;
alter table public.matches alter column match_status set default 'scheduled';
alter table public.matches alter column match_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'matches_championship_id_fkey'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_championship_id_fkey
      foreign key (championship_id) references public.championships(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'matches_round_number_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_round_number_check check (round_number is null or round_number > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'matches_scores_nonnegative_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_scores_nonnegative_check
      check ((jene_score is null or jene_score >= 0) and (opponent_score is null or opponent_score >= 0));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'matches_match_status_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_match_status_check check (match_status in ('scheduled', 'finished', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'matches_result_consistency_check'
      and conrelid = 'public.matches'::regclass
  ) then
    alter table public.matches
      add constraint matches_result_consistency_check check (
        (match_status = 'finished' and jene_score is not null and opponent_score is not null)
        or
        (match_status in ('scheduled', 'cancelled') and jene_score is null and opponent_score is null)
      );
  end if;
end $$;

create index if not exists championships_status_start_date_idx
  on public.championships (status, start_date desc);
create index if not exists championship_categories_category_id_idx
  on public.championship_categories (category_id);
create index if not exists matches_championship_date_time_idx
  on public.matches (championship_id, match_date, match_time)
  where championship_id is not null;

create or replace function public.set_championships_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists championships_set_updated_at on public.championships;
create trigger championships_set_updated_at
before update on public.championships
for each row execute function public.set_championships_updated_at();

create or replace function public.validate_match_championship_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.championship_id is not null and not exists (
    select 1
    from public.championship_categories cc
    where cc.championship_id = new.championship_id
      and cc.category_id = new.category_id
  ) then
    raise exception 'A categoria do jogo não pertence ao campeonato selecionado.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists matches_validate_championship_category on public.matches;
create trigger matches_validate_championship_category
before insert or update of championship_id, category_id on public.matches
for each row execute function public.validate_match_championship_category();

create or replace function public.prevent_used_championship_category_removal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.matches m
    where m.championship_id = old.championship_id
      and m.category_id = old.category_id
  ) then
    raise exception 'A categoria possui jogos neste campeonato e não pode ser removida.'
      using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists championship_categories_preserve_used on public.championship_categories;
create trigger championship_categories_preserve_used
before delete on public.championship_categories
for each row execute function public.prevent_used_championship_category_removal();

alter table public.championships enable row level security;
alter table public.championship_categories enable row level security;

drop policy if exists "Authorized staff can read championships" on public.championships;
create policy "Authorized staff can read championships"
on public.championships for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
);

drop policy if exists "Authorized staff can create championships" on public.championships;
create policy "Authorized staff can create championships"
on public.championships for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
);

drop policy if exists "Authorized staff can update championships" on public.championships;
create policy "Authorized staff can update championships"
on public.championships for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
);

-- DELETE existe apenas para desfazer criação incompleta e só funciona sem jogos.
drop policy if exists "Authorized staff can delete empty championships" on public.championships;
create policy "Authorized staff can delete empty championships"
on public.championships for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
  and not exists (
    select 1 from public.matches m where m.championship_id = championships.id
  )
);

drop policy if exists "Authorized staff can read championship categories" on public.championship_categories;
create policy "Authorized staff can read championship categories"
on public.championship_categories for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
);

drop policy if exists "Authorized staff can create championship categories" on public.championship_categories;
create policy "Authorized staff can create championship categories"
on public.championship_categories for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
);

drop policy if exists "Authorized staff can delete championship categories" on public.championship_categories;
create policy "Authorized staff can delete championship categories"
on public.championship_categories for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active is true
      and lower(p.role::text) in ('admin', 'gestor')
  )
);

revoke all on table public.championships from public, anon;
revoke all on table public.championship_categories from public, anon;
grant select, insert, update, delete on table public.championships to authenticated;
grant select, insert, delete on table public.championship_categories to authenticated;

revoke all on function public.set_championships_updated_at() from public, anon, authenticated;
revoke all on function public.validate_match_championship_category() from public, anon, authenticated;
revoke all on function public.prevent_used_championship_category_removal() from public, anon, authenticated;

comment on table public.championships is 'Competições que agrupam jogos da JENE.';
comment on table public.championship_categories is 'Categorias participantes de cada campeonato.';
comment on column public.matches.championship_id is 'Campeonato opcional; NULL identifica jogo independente.';

commit;
