-- Allow approximate last-seen dates (e.g. "around March 2024", "not sure")
alter table public.missing_people
  alter column last_seen_date type text
  using case
    when last_seen_date is null then null
    else last_seen_date::text
  end;
