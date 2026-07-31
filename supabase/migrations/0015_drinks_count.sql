-- "How many drinks?" — an optional count captured at submission, shown only in
-- the info overlay for now. Additive and backward-compatible: existing photos
-- default to 0, and adding drinks_count to get_week_feed's output is ignored by
-- any code that doesn't read it, so production keeps working unchanged.

alter table photos
  add column if not exists drinks_count int not null default 0
  check (drinks_count >= 0 and drinks_count <= 50);

-- Adding a column to the return type requires a drop; both run in one
-- transaction so there's no moment where the app sees no function.
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
  drinks_count int
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
    coalesce(cc.caption_count, 0) as caption_count,
    r.drinks_count
  from ranked r
  left join top_captions tc on tc.photo_id = r.id
  left join caption_counts cc on cc.photo_id = r.id
  order by r.rank;
$$;
