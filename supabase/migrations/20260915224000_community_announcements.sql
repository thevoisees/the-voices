-- National community announcements (marches, prayer meetings, etc.)

create table if not exists public.community_announcements (
  id uuid primary key,
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  kind text not null check (kind in ('march', 'prayer', 'meeting', 'vigil', 'other')),
  voice text not null check (voice in ('group', 'individual')),
  organizer text not null,
  when_text text not null,
  where_text text not null,
  join_note text,
  flag_count integer not null default 0,
  hidden boolean not null default false
);

create index if not exists community_announcements_created_idx
  on public.community_announcements (created_at desc);

create table if not exists public.announcement_flags (
  announcement_id uuid not null references public.community_announcements(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (announcement_id, device_id)
);

alter table public.community_announcements enable row level security;
alter table public.announcement_flags enable row level security;

drop policy if exists "Public read announcements" on public.community_announcements;
create policy "Public read announcements"
  on public.community_announcements for select to anon, authenticated
  using (hidden = false);

drop policy if exists "Public insert announcements" on public.community_announcements;
create policy "Public insert announcements"
  on public.community_announcements for insert to anon, authenticated
  with check (true);

drop policy if exists "Public update announcements" on public.community_announcements;
create policy "Public update announcements"
  on public.community_announcements for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "Public read announcement flags" on public.announcement_flags;
create policy "Public read announcement flags"
  on public.announcement_flags for select to anon, authenticated using (true);

drop policy if exists "Public insert announcement flags" on public.announcement_flags;
create policy "Public insert announcement flags"
  on public.announcement_flags for insert to anon, authenticated with check (true);
