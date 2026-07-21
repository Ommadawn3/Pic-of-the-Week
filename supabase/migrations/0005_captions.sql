-- Ranked captions for a photo, with per-viewer vote/author flags.
-- SECURITY INVOKER so auth.uid() is the real caller and has_voted/is_author
-- reflect the signed-in user (null for anonymous).

create or replace function public.get_photo_captions(p_photo_id uuid)
returns table (
  id uuid,
  body text,
  author_user_id uuid,
  vote_count bigint,
  has_voted boolean,
  is_author boolean,
  rank bigint,
  created_at timestamptz
)
language sql
stable
security invoker
as $$
  select
    c.id,
    c.body,
    c.author_user_id,
    count(v.id) as vote_count,
    bool_or(v.voter_user_id = auth.uid()) as has_voted,
    (c.author_user_id = auth.uid()) as is_author,
    row_number() over (order by count(v.id) desc, c.created_at asc) as rank,
    c.created_at
  from captions c
  left join caption_votes v on v.caption_id = c.id
  where c.photo_id = p_photo_id and c.deleted_at is null
  group by c.id
  order by rank;
$$;
