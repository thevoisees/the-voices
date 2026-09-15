-- Community flags, goal petitions, found disputes

alter table public.reports
  add column if not exists flag_count integer not null default 0;

alter table public.missing_people
  add column if not exists flag_count integer not null default 0;

alter table public.missing_people
  add column if not exists dispute_count integer not null default 0;

create table if not exists public.report_flags (
  report_id uuid not null references public.reports(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (report_id, device_id)
);

create table if not exists public.missing_flags (
  person_id uuid not null references public.missing_people(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (person_id, device_id)
);

create table if not exists public.missing_disputes (
  person_id uuid not null references public.missing_people(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (person_id, device_id)
);

create table if not exists public.area_petitions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  title text not null,
  ask text not null,
  grid_key text not null,
  grid_lat double precision not null,
  grid_lng double precision not null,
  goal integer not null default 20 check (goal >= 1),
  count integer not null default 0,
  flag_count integer not null default 0,
  hidden boolean not null default false
);

create index if not exists area_petitions_grid_idx on public.area_petitions (grid_key);
create index if not exists area_petitions_created_idx on public.area_petitions (created_at desc);

create table if not exists public.area_petition_signs (
  petition_id uuid not null references public.area_petitions(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (petition_id, device_id)
);

create table if not exists public.area_petition_flags (
  petition_id uuid not null references public.area_petitions(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (petition_id, device_id)
);

alter table public.report_flags enable row level security;
alter table public.missing_flags enable row level security;
alter table public.missing_disputes enable row level security;
alter table public.area_petitions enable row level security;
alter table public.area_petition_signs enable row level security;
alter table public.area_petition_flags enable row level security;

drop policy if exists "Public read report flags" on public.report_flags;
create policy "Public read report flags"
  on public.report_flags for select to anon, authenticated using (true);
drop policy if exists "Public insert report flags" on public.report_flags;
create policy "Public insert report flags"
  on public.report_flags for insert to anon, authenticated with check (true);

drop policy if exists "Public read missing flags" on public.missing_flags;
create policy "Public read missing flags"
  on public.missing_flags for select to anon, authenticated using (true);
drop policy if exists "Public insert missing flags" on public.missing_flags;
create policy "Public insert missing flags"
  on public.missing_flags for insert to anon, authenticated with check (true);

drop policy if exists "Public read missing disputes" on public.missing_disputes;
create policy "Public read missing disputes"
  on public.missing_disputes for select to anon, authenticated using (true);
drop policy if exists "Public insert missing disputes" on public.missing_disputes;
create policy "Public insert missing disputes"
  on public.missing_disputes for insert to anon, authenticated with check (true);

drop policy if exists "Public read area petitions" on public.area_petitions;
create policy "Public read area petitions"
  on public.area_petitions for select to anon, authenticated using (hidden = false);
drop policy if exists "Public insert area petitions" on public.area_petitions;
create policy "Public insert area petitions"
  on public.area_petitions for insert to anon, authenticated with check (true);
drop policy if exists "Public update area petitions" on public.area_petitions;
create policy "Public update area petitions"
  on public.area_petitions for update to anon, authenticated using (true) with check (true);

drop policy if exists "Public read petition signs" on public.area_petition_signs;
create policy "Public read petition signs"
  on public.area_petition_signs for select to anon, authenticated using (true);
drop policy if exists "Public insert petition signs" on public.area_petition_signs;
create policy "Public insert petition signs"
  on public.area_petition_signs for insert to anon, authenticated with check (true);

drop policy if exists "Public read petition flags" on public.area_petition_flags;
create policy "Public read petition flags"
  on public.area_petition_flags for select to anon, authenticated using (true);
drop policy if exists "Public insert petition flags" on public.area_petition_flags;
create policy "Public insert petition flags"
  on public.area_petition_flags for insert to anon, authenticated with check (true);

-- Allow public updates on reports / missing for flag_count + hidden (moderation)
drop policy if exists "Public update reports flags" on public.reports;
create policy "Public update reports flags"
  on public.reports for update to anon, authenticated using (true) with check (true);
