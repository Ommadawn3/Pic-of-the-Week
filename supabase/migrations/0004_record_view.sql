-- Records a viewer's dwell time on a photo. Enforces the anti-gaming rules
-- server-side (PRD §4.3):
--   * seconds are clamped to [0, 120]
--   * only the viewer's single BEST (longest) session is kept — re-viewing a
--     photo never lowers, and never inflates, its stored value
--   * archived weeks don't accept new views
-- Runs as the caller (SECURITY INVOKER) so auth.uid() is the real viewer and
-- RLS applies.

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

  insert into view_sessions (photo_id, viewer_user_id, seconds_viewed)
  values (p_photo_id, v_uid, v_secs)
  on conflict (photo_id, viewer_user_id)
  do update set seconds_viewed = greatest(view_sessions.seconds_viewed, excluded.seconds_viewed);
end;
$$;
