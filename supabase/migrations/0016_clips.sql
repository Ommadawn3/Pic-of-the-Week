-- Video clips: a photo can now be a 2s silent clip instead of a still.
--
-- Ranking folds in replays: each replay a viewer taps is worth 4 seconds of
-- view time, added to that viewer's best dwell session and capped at 120s (so
-- one obsessive viewer can't run away with it), then averaged across viewers.
-- Clips can therefore out-score photos, which is intended. The static first
-- frame still accrues normal dwell time via record_view, unchanged.

alter table photos
  add column if not exists media_type text not null default 'photo'
  check (media_type in ('photo', 'clip'));

alter table view_sessions
  add column if not exists replay_count int not null default 0
  check (replay_count >= 0);

-- Effective seconds now include replays. Additive, so photos (replay_count 0)
-- score exactly as before.
create or replace view photo_scores as
select
  photo_id,
  avg(least(120, seconds_viewed + replay_count * 4)) as score,
  count(*) as viewer_count,
  coalesce(sum(replay_count), 0) as replay_count
from view_sessions
group by photo_id;

-- record_replay: +1 to this viewer's replay tally on the photo. Active week
-- only, best-effort event log, mirrors record_view's guards.
create or replace function public.record_replay(p_photo_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_active boolean;
begin
  if v_uid is null then
    return;
  end if;

  select (cw.status = 'active') into v_active
  from photos p
  join contest_weeks cw on cw.id = p.contest_week_id
  where p.id = p_photo_id and p.deleted_at is null;

  if v_active is distinct from true then
    return;
  end if;

  insert into view_sessions (photo_id, viewer_user_id, seconds_viewed, replay_count)
  values (p_photo_id, v_uid, 0, 1)
  on conflict (photo_id, viewer_user_id)
  do update set replay_count = view_sessions.replay_count + 1;

  begin
    insert into view_events (photo_id, viewer_user_id, seconds_viewed)
    values (p_photo_id, v_uid, 4);
  exception when others then
    null;
  end;
end;
$$;

grant execute on function public.record_replay(uuid) to authenticated;

-- Feed returns media_type and replay totals. Return-type change needs a drop;
-- both run in one transaction so the app never sees a missing function.
drop function if exists public.get_week_feed(uuid);

create function public.get_week_feed(week_id uuid)
returns table (
  id uuid,
  contest_week_id uuid,
  owner_user_id uuid,
  image_url text,
  first_name text,
  initial text,
  captured_at timestamptz,
  created_at timestamptz,
  score numeric,
  viewer_count bigint,
  rank bigint,
  top_caption text,
  caption_count bigint,
  drinks_count int,
  media_type text,
  replay_count bigint
)
language sql
stable
as $$
  with scored as (
    select
      p.*,
      coalesce(s.score, 0) as score,
      coalesce(s.viewer_count, 0) as viewer_count,
      coalesce(s.replay_count, 0) as replay_count
    from photos p
    left join photo_scores s on s.photo_id = p.id
    where p.contest_week_id = week_id
      and p.deleted_at is null
  ),
  ranked as (
    select
      scored.*,
      row_number() over (order by scored.score desc, scored.created_at asc) as rank
    from scored
  ),
  top_captions as (
    select distinct on (c.photo_id)
      c.photo_id,
      c.body,
      count(v.id) over (partition by c.id) as vote_count
    from captions c
    left join caption_votes v on v.caption_id = c.id
    where c.deleted_at is null
    order by c.photo_id, vote_count desc, c.created_at asc
  ),
  caption_counts as (
    select photo_id, count(*) as caption_count
    from captions
    where deleted_at is null
    group by photo_id
  )
  select
    r.id,
    r.contest_week_id,
    r.owner_user_id,
    r.image_url,
    r.first_name,
    r.initial,
    r.captured_at,
    r.created_at,
    r.score,
    r.viewer_count,
    r.rank,
    tc.body as top_caption,
    coalesce(cc.caption_count, 0) as caption_count,
    r.drinks_count,
    r.media_type,
    r.replay_count
  from ranked r
  left join top_captions tc on tc.photo_id = r.id
  left join caption_counts cc on cc.photo_id = r.id
  order by r.rank;
$$;
