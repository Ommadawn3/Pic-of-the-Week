-- Archived weeks are read-only (PRD §4.5): no new captions or votes on photos
-- whose contest week is archived. Enforced at the RLS layer so it holds
-- regardless of app code. (record_view already guards this in its function.)

drop policy if exists "authenticated users can insert captions" on captions;
create policy "authenticated users can insert captions" on captions
  for insert with check (
    auth.uid() = author_user_id
    and exists (
      select 1 from photos p
      join contest_weeks cw on cw.id = p.contest_week_id
      where p.id = photo_id and p.deleted_at is null and cw.status = 'active'
    )
  );

drop policy if exists "authenticated users can vote" on caption_votes;
create policy "authenticated users can vote" on caption_votes
  for insert with check (
    auth.uid() = voter_user_id
    and voter_user_id <> (select author_user_id from captions where id = caption_id)
    and exists (
      select 1 from captions c
      join photos p on p.id = c.photo_id
      join contest_weeks cw on cw.id = p.contest_week_id
      where c.id = caption_id and cw.status = 'active'
    )
  );
