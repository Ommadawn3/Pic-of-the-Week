-- Pic of the Week: initial schema
-- See CLAUDE_CODE_PROMPT.md and PRD.md for the full spec this implements.

create extension if not exists pgcrypto;

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table contest_weeks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('active', 'archived')) default 'active'
);

create unique index one_active_week on contest_weeks (status) where status = 'active';

create table photos (
  id uuid primary key default gen_random_uuid(),
  contest_week_id uuid not null references contest_weeks(id),
  owner_user_id uuid not null references users(id),
  image_url text not null,
  first_name text not null,
  initial text,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index one_photo_per_user_per_week
  on photos (contest_week_id, owner_user_id)
  where deleted_at is null;

create table captions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos(id),
  author_user_id uuid not null references users(id),
  body text not null check (char_length(body) <= 150),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index one_caption_per_user_per_photo
  on captions (photo_id, author_user_id)
  where deleted_at is null;

create table caption_votes (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references captions(id),
  voter_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (caption_id, voter_user_id)
);

create table view_sessions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos(id),
  viewer_user_id uuid not null references users(id),
  seconds_viewed numeric not null check (seconds_viewed >= 0 and seconds_viewed <= 120),
  created_at timestamptz not null default now(),
  unique (photo_id, viewer_user_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('photo', 'caption')),
  target_id uuid not null,
  reporter_user_id uuid not null references users(id),
  reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

-- Helper view: photo score = mean of each viewer's single best (capped) session.
create view photo_scores as
select
  photo_id,
  avg(seconds_viewed) as score,
  count(*) as viewer_count
from view_sessions
group by photo_id;

-- Auto-create a users row on first sign-in.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Row Level Security
alter table users enable row level security;
alter table contest_weeks enable row level security;
alter table photos enable row level security;
alter table captions enable row level security;
alter table caption_votes enable row level security;
alter table view_sessions enable row level security;
alter table reports enable row level security;

create policy "users can read their own row" on users
  for select using (auth.uid() = id);

create policy "anyone can read contest weeks" on contest_weeks
  for select using (true);

create policy "anyone can read non-deleted photos" on photos
  for select using (deleted_at is null);

create policy "owner can insert their own photo" on photos
  for insert with check (auth.uid() = owner_user_id);

create policy "owner can soft-delete their own photo" on photos
  for update using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "anyone can read non-deleted captions" on captions
  for select using (deleted_at is null);

create policy "authenticated users can insert captions" on captions
  for insert with check (auth.uid() = author_user_id);

create policy "author can soft-delete their own caption" on captions
  for update using (auth.uid() = author_user_id)
  with check (auth.uid() = author_user_id);

create policy "anyone can read caption votes" on caption_votes
  for select using (true);

create policy "authenticated users can vote" on caption_votes
  for insert with check (
    auth.uid() = voter_user_id
    and voter_user_id <> (select author_user_id from captions where id = caption_id)
  );

create policy "voter can remove their own vote" on caption_votes
  for delete using (auth.uid() = voter_user_id);

create policy "anyone can read view sessions" on view_sessions
  for select using (true);

create policy "authenticated users can record their own view session" on view_sessions
  for insert with check (auth.uid() = viewer_user_id);

create policy "authenticated users can update their own view session" on view_sessions
  for update using (auth.uid() = viewer_user_id)
  with check (auth.uid() = viewer_user_id);

create policy "authenticated users can file a report" on reports
  for insert with check (auth.uid() = reporter_user_id);

-- No public select policy on reports: only accessible via the service-role key (admin dashboard).
