-- Append-only log of every view session, for evaluating scoring changes.
--
-- `view_sessions` keeps only each viewer's single best session
-- (greatest(existing, excluded)), which is what the live ranking uses. That's
-- deliberate anti-gaming, but it also means revisits and re-shares are thrown
-- away — so we can't retroactively ask "what would totals, or summed sessions,
-- or a smoothed average have looked like?".
--
-- This table changes NOTHING about ranking. It just stops discarding the data
-- so the scoring decision can be made against real numbers instead of guesses.

create table if not exists view_events (
  id bigserial primary key,
  photo_id uuid not null references photos(id) on delete cascade,
  viewer_user_id uuid not null references users(id) on delete cascade,
  seconds_viewed numeric not null check (seconds_viewed >= 0 and seconds_viewed <= 120),
  created_at timestamptz not null default now()
);

create index if not exists view_events_photo_idx on view_events (photo_id);
create index if not exists view_events_viewer_idx on view_events (viewer_user_id, photo_id);

alter table view_events enable row level security;

-- Written only through record_view (security definer); no direct client access.
-- No select policy: analysis runs via the service role.

-- Extend record_view to also append to the log. The existing best-session
-- upsert is untouched, so live rankings are unaffected.
create or replace function public.record_view(p_photo_id uuid, p_seconds numeric)
returns void
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_secs numeric := least(greatest(coalesce(p_seconds, 0), 0), 120);
  v_active boolean;
begin
  if v_uid is null then
    return; -- anonymous views don't count
  end if;

  select (cw.status = 'active') into v_active
  from photos p
  join contest_weeks cw on cw.id = p.contest_week_id
  where p.id = p_photo_id and p.deleted_at is null;

  if v_active is distinct from true then
    return; -- photo missing/deleted, or its week is archived
  end if;

  -- Live ranking input: best session per viewer (unchanged).
  insert into view_sessions (photo_id, viewer_user_id, seconds_viewed)
  values (p_photo_id, v_uid, v_secs)
  on conflict (photo_id, viewer_user_id)
  do update set seconds_viewed = greatest(view_sessions.seconds_viewed, excluded.seconds_viewed);

  -- Analysis log: every session, nothing collapsed.
  insert into view_events (photo_id, viewer_user_id, seconds_viewed)
  values (p_photo_id, v_uid, v_secs);
end;
$$;

-- record_view is SECURITY INVOKER, so the caller needs insert rights on the log.
grant insert on view_events to authenticated;
grant usage, select on sequence view_events_id_seq to authenticated;
