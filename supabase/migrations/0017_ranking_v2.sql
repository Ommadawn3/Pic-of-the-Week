-- Ranking v2: honest attention.
--
-- Moves the score source from view_sessions (which kept only each viewer's single
-- BEST session) to view_events (append-only, revisit-aware), and rebuilds it to
-- reward genuine, validated attention instead of self-viewing and thin-sample noise.
--
-- What changed and why (all validated against real data on 2026-08-18):
--   * EXCLUDE owner self-views. 48% of all view activity was people watching their
--     own photos; the live #1 was a self-view artifact with zero real viewers.
--   * FLOOR sub-1s glances. 38% of events were <1s accidental scroll-bys.
--   * CUMULATIVE repeat views (not best-session), CAPPED at 120s per viewer so one
--     obsessive viewer (or a clip replayer) can't run away with it.
--   * SMOOTHED average: (total + C*mean)/(viewers + C). A photo with one lingering
--     viewer is pulled toward the week mean and can't rocket to #1 on thin data.
--   * VALIDATION GATE: a photo is leaderboard-eligible only once seen by >= 30% of
--     the week's genuine viewers. Percentage-based so it scales with the audience.
--
-- Tunables live here: FLOOR_SECS=1, PER_VIEWER_CAP=120, SMOOTHING_C=5, GATE_PCT=0.30.

-- Drop dependents first: get_week_feed reads photo_scores, and the view's column
-- set is changing (adds week_viewers/validated), which create-or-replace forbids.
drop function if exists public.get_week_feed(uuid);
drop view if exists photo_scores;

create view photo_scores as
with ev as (
  -- Qualifying events only: genuine (non-owner) viewers, glances >= 1s.
  select p.id as photo_id, e.viewer_user_id, p.contest_week_id, e.seconds_viewed
  from view_events e
  join photos p on p.id = e.photo_id
  where e.viewer_user_id <> p.owner_user_id
    and e.seconds_viewed >= 1
),
pair as (
  -- Per (viewer, photo): cumulative time across all their visits, capped at 120s.
  select photo_id, viewer_user_id, contest_week_id,
         least(120, sum(seconds_viewed)) as pair_secs
  from ev
  group by photo_id, viewer_user_id, contest_week_id
),
week_stats as (
  -- Per week: mean per-viewer value (the smoothing prior) and the size of the
  -- genuine-viewer universe (the denominator for the validation gate).
  select contest_week_id,
         avg(pair_secs) as m,
         count(distinct viewer_user_id) as week_viewers
  from pair
  group by contest_week_id
),
per_photo as (
  select photo_id, contest_week_id,
         count(*)      as viewer_count,   -- distinct genuine viewers
         sum(pair_secs) as total
  from pair
  group by photo_id, contest_week_id
),
replays as (
  -- Display only (InfoOverlay): count at most one replay per person, self excluded.
  select vs.photo_id, count(*) filter (where vs.replay_count > 0) as replay_count
  from view_sessions vs
  join photos p on p.id = vs.photo_id
  where vs.viewer_user_id <> p.owner_user_id
  group by vs.photo_id
)
select
  pp.photo_id,
  round((pp.total + 5 * ws.m) / (pp.viewer_count + 5), 4) as score,
  pp.viewer_count,
  ws.week_viewers,
  (pp.viewer_count >= ceil(0.30 * ws.week_viewers))::boolean as validated,
  coalesce(r.replay_count, 0) as replay_count
from per_photo pp
join week_stats ws on ws.contest_week_id = pp.contest_week_id
left join replays r on r.photo_id = pp.photo_id;

-- get_week_feed: same return signature as 0016 (no app changes needed for the
-- reshuffle), but rank now honors the gate: validated photos always sort above
-- unvalidated ones, so nothing reaches #1 without enough real viewers.
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
      coalesce(s.validated, false) as validated,
      coalesce(s.replay_count, 0) as replay_count
    from photos p
    left join photo_scores s on s.photo_id = p.id
    where p.contest_week_id = week_id
      and p.deleted_at is null
  ),
  ranked as (
    select
      scored.*,
      -- Validated first (gate), then by smoothed score. Unvalidated photos still
      -- get a number, but they can only ever sit below every validated photo.
      row_number() over (
        order by scored.validated desc, scored.score desc, scored.created_at asc
      ) as rank
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
