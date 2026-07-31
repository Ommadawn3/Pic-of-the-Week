-- Views stopped recording entirely after 0011 added view_events.
--
-- record_view() (SECURITY INVOKER) inserts into view_sessions AND view_events
-- in one transaction. 0011 enabled RLS on view_events but added no INSERT
-- policy, so with RLS on and no policy every insert is denied. That denial
-- threw inside record_view and rolled back the WHOLE transaction — including
-- the view_sessions write that ranking depends on. Net effect: no photo has
-- recorded a view since 0011 deployed, so scores are all 0 and the feed falls
-- back to post-time order.
--
-- Two fixes:
--   1. give view_events an INSERT policy so the log actually works
--   2. make the log write best-effort inside record_view, so a logging failure
--      can NEVER again roll back the ranking write

create policy "record own view events" on view_events
  for insert with check (auth.uid() = viewer_user_id);

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

  -- Ranking input: best session per viewer. This must always succeed.
  insert into view_sessions (photo_id, viewer_user_id, seconds_viewed)
  values (p_photo_id, v_uid, v_secs)
  on conflict (photo_id, viewer_user_id)
  do update set seconds_viewed = greatest(view_sessions.seconds_viewed, excluded.seconds_viewed);

  -- Analysis log: strictly best-effort. If this ever fails it must not take
  -- the ranking write down with it, which is exactly what broke before.
  begin
    insert into view_events (photo_id, viewer_user_id, seconds_viewed)
    values (p_photo_id, v_uid, v_secs);
  exception when others then
    null;
  end;
end;
$$;
