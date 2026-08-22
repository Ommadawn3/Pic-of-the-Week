-- Cross-week leaderboard: the top validated photos over a time window.
-- period: 'month' (last 30d) | 'year' (last 365d) | 'all'. Only validated photos
-- (seen by >= 30% of their week's viewers) are eligible, so a thin-sample photo
-- can't top the board — same honesty as the weekly ranking (0017).

drop function if exists public.get_leaderboard(text);

create function public.get_leaderboard(period text)
returns table (
  photo_id uuid,
  contest_week_id uuid,
  image_url text,
  first_name text,
  initial text,
  drinks_count int,
  media_type text,
  score numeric,
  viewer_count bigint,
  rank bigint
)
language sql
stable
as $$
  with windowed as (
    select
      p.id, p.contest_week_id, p.image_url, p.first_name, p.initial, p.drinks_count, p.media_type,
      s.score, s.viewer_count
    from photos p
    join photo_scores s on s.photo_id = p.id
    where p.deleted_at is null
      and s.validated = true
      and (
        period = 'all'
        or (period = 'year' and p.created_at >= now() - interval '365 days')
        or (period = 'month' and p.created_at >= now() - interval '30 days')
      )
  )
  select
    id as photo_id, contest_week_id, image_url, first_name, initial, drinks_count, media_type,
    score, viewer_count,
    row_number() over (order by score desc, viewer_count desc) as rank
  from windowed
  order by rank
  limit 100;
$$;

grant execute on function public.get_leaderboard(text) to anon, authenticated;
