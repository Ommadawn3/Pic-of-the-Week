-- Persistent identity: a user sets their name ONCE, not on every submission.
--
-- Until now the display name lived only on each photo (photos.first_name), typed
-- fresh every time. Recurring users found re-entering it tedious, and leaderboards
-- / profiles need a stable per-person name. This moves the name onto the user row.

alter table users
  add column if not exists first_name text,
  add column if not exists initial text;

-- Backfill from each user's most recent photo so existing players skip the
-- first-run name prompt and keep the name they've been using.
update users u
set first_name = p.first_name,
    initial    = p.initial
from (
  select distinct on (owner_user_id) owner_user_id, first_name, initial
  from photos
  order by owner_user_id, created_at desc
) p
where p.owner_user_id = u.id
  and u.first_name is null;
