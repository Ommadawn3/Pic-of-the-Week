-- Ranked feed for a contest week.
-- Returns each non-deleted photo with its view-time score, rank, viewer
-- count, and its current top-voted caption. Tag logic (New/Trending/Leading)
-- is derived in the app from rank + created_at + score so it's easy to tune.

create or replace function public.get_week_feed(week_id uuid)
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
  caption_count bigint
)
language sql
stable
as $$
  with scored as (
    select
      p.*,
      coalesce(s.score, 0) as score,
      coalesce(s.viewer_count, 0) as viewer_count
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
    coalesce(cc.caption_count, 0) as caption_count
  from ranked r
  left join top_captions tc on tc.photo_id = r.id
  left join caption_counts cc on cc.photo_id = r.id
  order by r.rank;
$$;
