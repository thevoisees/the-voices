-- Prefer supabase/migrations/ for GitHub→Supabase deploy. This file mirrors the latest migration for SQL Editor paste.

-- The Voices: reports, petitions, missing persons, photo bucket
-- Applied via Supabase GitHub integration / db push

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  grid_lat double precision not null,
  grid_lng double precision not null,
  category text not null,
  reporter_role text not null check (reporter_role in ('self', 'bystander', 'other')),
  affected_gender text null check (
    affected_gender is null
    or affected_gender in ('woman', 'man', 'girl', 'boy', 'unknown')
  ),
  time_band text null,
  incident_date date null,
  what_happened text null,
  red_flag text null,
  vehicle_color text null,
  vehicle_type text null,
  vehicle_direction text null,
  involves_minor boolean not null default false,
  hidden boolean not null default false
);

create index if not exists reports_grid_idx on public.reports (grid_lat, grid_lng);
create index if not exists reports_created_idx on public.reports (created_at desc);
create index if not exists reports_hidden_idx on public.reports (hidden);

create table if not exists public.petitions (
  grid_key text primary key,
  count integer not null default 1,
  grid_lat double precision not null,
  grid_lng double precision not null
);

alter table public.reports enable row level security;
alter table public.petitions enable row level security;

drop policy if exists "Public read visible reports" on public.reports;
create policy "Public read visible reports"
  on public.reports for select
  to anon, authenticated
  using (hidden = false);

drop policy if exists "Public insert reports" on public.reports;
create policy "Public insert reports"
  on public.reports for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public read petitions" on public.petitions;
create policy "Public read petitions"
  on public.petitions for select
  to anon, authenticated
  using (true);

drop policy if exists "Public insert petitions" on public.petitions;
create policy "Public insert petitions"
  on public.petitions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public update petitions" on public.petitions;
create policy "Public update petitions"
  on public.petitions for update
  to anon, authenticated
  using (true)
  with check (true);

create table if not exists public.missing_people (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  photo text not null,
  gender text null,
  age_note text null,
  last_seen_place text not null,
  last_seen_date text null,
  grid_lat double precision null,
  grid_lng double precision null,
  description text null,
  contact_note text null,
  status text not null default 'missing'
    check (status in ('missing', 'found_alive', 'found_dead')),
  verify_alive integer not null default 0,
  verify_dead integer not null default 0,
  hidden boolean not null default false
);

create table if not exists public.missing_found_votes (
  person_id uuid not null references public.missing_people(id) on delete cascade,
  device_id text not null,
  outcome text not null check (outcome in ('alive', 'dead')),
  created_at timestamptz not null default now(),
  primary key (person_id, device_id)
);

alter table public.missing_people enable row level security;
alter table public.missing_found_votes enable row level security;

drop policy if exists "Public read missing people" on public.missing_people;
create policy "Public read missing people"
  on public.missing_people for select
  to anon, authenticated
  using (hidden = false);

drop policy if exists "Public insert missing people" on public.missing_people;
create policy "Public insert missing people"
  on public.missing_people for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public update missing people" on public.missing_people;
create policy "Public update missing people"
  on public.missing_people for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public read missing votes" on public.missing_found_votes;
create policy "Public read missing votes"
  on public.missing_found_votes for select
  to anon, authenticated
  using (true);

drop policy if exists "Public insert missing votes" on public.missing_found_votes;
create policy "Public insert missing votes"
  on public.missing_found_votes for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public upsert missing votes" on public.missing_found_votes;
create policy "Public upsert missing votes"
  on public.missing_found_votes for update
  to anon, authenticated
  using (true)
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'missing-photos',
  'missing-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set public = true;

drop policy if exists "Public read missing photos" on storage.objects;
create policy "Public read missing photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'missing-photos');

drop policy if exists "Public upload missing photos" on storage.objects;
create policy "Public upload missing photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'missing-photos');

drop policy if exists "Public update missing photos" on storage.objects;
create policy "Public update missing photos"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'missing-photos')
  with check (bucket_id = 'missing-photos');
