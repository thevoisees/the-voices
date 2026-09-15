-- Petition scope: national vs area-linked
alter table public.area_petitions
  add column if not exists scope text not null default 'area'
  check (scope in ('national', 'area'));

alter table public.area_petitions
  add column if not exists place_label text;

create index if not exists area_petitions_scope_idx on public.area_petitions (scope);
