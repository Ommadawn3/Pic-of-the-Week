-- Surface each photo's discovery STATE to the feed so the browse order can
-- alternate Hot/New cards between the numbered leaderboard, all week long.
--
--   ranked : validated (>= 30% of the week's genuine viewers) — the leaderboard.
--   new    : barely seen yet (< 15% of the week's viewers) — needs exposure.
--   hot    : seen by enough to be interesting but not yet validated — promising,
--            unproven. These are the ones worth pushing so they can validate.
--
-- Replaces the old recency-based "new" (which expired in a day, leaving no new
-- photos at all) with a view-count-based one, per the ranking v2 model (0017).
-- Adds one column to get_week_feed; the return is otherwise unchanged.

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
  replay_count bigint,
  state text
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
      coalesce(s.week_viewers, 0) as week_viewers_row,
      coalesce(s.replay_count, 0) as replay_count
    from photos p
    left join photo_scores s on s.photo_id = p.id
    where p.contest_week_id = week_id
      and p.deleted_at is null
  ),
  wk as (
    -- The week's genuine-viewer universe is the same for every photo; take it
    -- from whichever scored rows have it (zero-viewer photos contribute 0).
    select max(week_viewers_row) as week_viewers from scored
  ),
  ranked as (
    select
      scored.*,
      row_number() over (
        order by scored.validated desc, scored.score desc, scored.created_at asc
      ) as rank,
      case
        when scored.validated then 'ranked'
        when wk.week_viewers = 0 then 'new'
        when scored.viewer_count < ceil(0.15 * wk.week_viewers) then 'new'
        else 'hot'
      end as state
    from scored
    cross join wk
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
    r.replay_count,
    r.state
  from ranked r
  left join top_captions tc on tc.photo_id = r.id
  left join caption_counts cc on cc.photo_id = r.id
  order by r.rank;
$$;
