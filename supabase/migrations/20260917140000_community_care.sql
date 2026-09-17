-- Community care: sightings, search squads, neighborhood forums

-- ── Sightings ──────────────────────────────────────────────
create table if not exists public.missing_sightings (
  id uuid primary key,
  created_at timestamptz not null default now(),
  person_id uuid not null references public.missing_people(id) on delete cascade,
  place_text text not null,
  when_text text not null,
  note text,
  grid_lat double precision,
  grid_lng double precision,
  confirm_count integer not null default 0,
  flag_count integer not null default 0,
  hidden boolean not null default false
);

create index if not exists missing_sightings_person_idx
  on public.missing_sightings (person_id, created_at desc);

create table if not exists public.missing_sighting_confirms (
  sighting_id uuid not null references public.missing_sightings(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (sighting_id, device_id)
);

create table if not exists public.missing_sighting_flags (
  sighting_id uuid not null references public.missing_sightings(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (sighting_id, device_id)
);

alter table public.missing_sightings enable row level security;
alter table public.missing_sighting_confirms enable row level security;
alter table public.missing_sighting_flags enable row level security;

drop policy if exists "Public read sightings" on public.missing_sightings;
create policy "Public read sightings"
  on public.missing_sightings for select to anon, authenticated
  using (hidden = false);

drop policy if exists "Public insert sightings" on public.missing_sightings;
create policy "Public insert sightings"
  on public.missing_sightings for insert to anon, authenticated
  with check (true);

drop policy if exists "Public update sightings" on public.missing_sightings;
create policy "Public update sightings"
  on public.missing_sightings for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "Public read sighting confirms" on public.missing_sighting_confirms;
create policy "Public read sighting confirms"
  on public.missing_sighting_confirms for select to anon, authenticated using (true);

drop policy if exists "Public insert sighting confirms" on public.missing_sighting_confirms;
create policy "Public insert sighting confirms"
  on public.missing_sighting_confirms for insert to anon, authenticated with check (true);

drop policy if exists "Public read sighting flags" on public.missing_sighting_flags;
create policy "Public read sighting flags"
  on public.missing_sighting_flags for select to anon, authenticated using (true);

drop policy if exists "Public insert sighting flags" on public.missing_sighting_flags;
create policy "Public insert sighting flags"
  on public.missing_sighting_flags for insert to anon, authenticated with check (true);

-- ── Forums (created before searches so search_calls can reference them) ──
create table if not exists public.neighborhood_forums (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null,
  area_text text not null,
  grid_lat double precision,
  grid_lng double precision,
  convenor_name text not null,
  convenor_contact text not null,
  associates_text text,
  about text,
  what_we_do text,
  flag_count integer not null default 0,
  hidden boolean not null default false
);

create index if not exists neighborhood_forums_created_idx
  on public.neighborhood_forums (created_at desc);

create table if not exists public.forum_flags (
  forum_id uuid not null references public.neighborhood_forums(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (forum_id, device_id)
);

alter table public.neighborhood_forums enable row level security;
alter table public.forum_flags enable row level security;

drop policy if exists "Public read forums" on public.neighborhood_forums;
create policy "Public read forums"
  on public.neighborhood_forums for select to anon, authenticated
  using (hidden = false);

drop policy if exists "Public insert forums" on public.neighborhood_forums;
create policy "Public insert forums"
  on public.neighborhood_forums for insert to anon, authenticated
  with check (true);

drop policy if exists "Public update forums" on public.neighborhood_forums;
create policy "Public update forums"
  on public.neighborhood_forums for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "Public read forum flags" on public.forum_flags;
create policy "Public read forum flags"
  on public.forum_flags for select to anon, authenticated using (true);

drop policy if exists "Public insert forum flags" on public.forum_flags;
create policy "Public insert forum flags"
  on public.forum_flags for insert to anon, authenticated with check (true);

-- ── Search calls + squads ──────────────────────────────────
create table if not exists public.search_calls (
  id uuid primary key,
  created_at timestamptz not null default now(),
  person_id uuid not null references public.missing_people(id) on delete cascade,
  area_text text not null,
  grid_lat double precision,
  grid_lng double precision,
  when_text text not null,
  guidance text,
  status text not null default 'recruiting'
    check (status in ('recruiting', 'active', 'closed')),
  marshal_name text,
  marshal_contact text,
  forum_id uuid references public.neighborhood_forums(id) on delete set null,
  flag_count integer not null default 0,
  hidden boolean not null default false
);

create index if not exists search_calls_status_idx
  on public.search_calls (status, created_at desc);

create index if not exists search_calls_person_idx
  on public.search_calls (person_id);

create table if not exists public.search_squads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  search_id uuid not null references public.search_calls(id) on delete cascade,
  label text not null,
  meet_place text not null,
  meet_when text not null,
  grid_lat double precision,
  grid_lng double precision,
  marshal_name text,
  marshal_contact text,
  join_count integer not null default 0
);

create index if not exists search_squads_search_idx
  on public.search_squads (search_id);

create table if not exists public.search_joins (
  squad_id uuid not null references public.search_squads(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (squad_id, device_id)
);

create table if not exists public.search_flags (
  search_id uuid not null references public.search_calls(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (search_id, device_id)
);

alter table public.search_calls enable row level security;
alter table public.search_squads enable row level security;
alter table public.search_joins enable row level security;
alter table public.search_flags enable row level security;

drop policy if exists "Public read search calls" on public.search_calls;
create policy "Public read search calls"
  on public.search_calls for select to anon, authenticated
  using (hidden = false);

drop policy if exists "Public insert search calls" on public.search_calls;
create policy "Public insert search calls"
  on public.search_calls for insert to anon, authenticated
  with check (true);

drop policy if exists "Public update search calls" on public.search_calls;
create policy "Public update search calls"
  on public.search_calls for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "Public read search squads" on public.search_squads;
create policy "Public read search squads"
  on public.search_squads for select to anon, authenticated using (true);

drop policy if exists "Public insert search squads" on public.search_squads;
create policy "Public insert search squads"
  on public.search_squads for insert to anon, authenticated with check (true);

drop policy if exists "Public update search squads" on public.search_squads;
create policy "Public update search squads"
  on public.search_squads for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "Public read search joins" on public.search_joins;
create policy "Public read search joins"
  on public.search_joins for select to anon, authenticated using (true);

drop policy if exists "Public insert search joins" on public.search_joins;
create policy "Public insert search joins"
  on public.search_joins for insert to anon, authenticated with check (true);

drop policy if exists "Public read search flags" on public.search_flags;
create policy "Public read search flags"
  on public.search_flags for select to anon, authenticated using (true);

drop policy if exists "Public insert search flags" on public.search_flags;
create policy "Public insert search flags"
  on public.search_flags for insert to anon, authenticated with check (true);
