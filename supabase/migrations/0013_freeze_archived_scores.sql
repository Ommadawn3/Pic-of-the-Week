-- Make "archived weeks are final" true at the database layer, not just in app
-- code.
--
-- record_view() already refuses to record views for a non-active week, so the
-- app can't change an archived ranking. But the view_sessions INSERT/UPDATE
-- policies had no week-status check, so a direct POST to /rest/v1/view_sessions
-- with the (public) anon key could inflate an archived photo's score and
-- reorder a finished contest. caption_votes DELETE had the same gap, letting
-- someone withdraw a vote from a closed week even though casting one was
-- already blocked.
--
-- Writes to a finished contest are now rejected regardless of how they arrive.

drop policy if exists "authenticated users can record their own view session" on view_sessions;
create policy "authenticated users can record their own view session" on view_sessions
  for insert with check (
    auth.uid() = viewer_user_id
    and exists (
      select 1 from photos p
      join contest_weeks cw on cw.id = p.contest_week_id
      where p.id = photo_id and p.deleted_at is null and cw.status = 'active'
    )
  );

drop policy if exists "authenticated users can update their own view session" on view_sessions;
create policy "authenticated users can update their own view session" on view_sessions
  for update using (
    auth.uid() = viewer_user_id
    and exists (
      select 1 from photos p
      join contest_weeks cw on cw.id = p.contest_week_id
      where p.id = photo_id and cw.status = 'active'
    )
  )
  with check (
    auth.uid() = viewer_user_id
    and exists (
      select 1 from photos p
      join contest_weeks cw on cw.id = p.contest_week_id
      where p.id = photo_id and cw.status = 'active'
    )
  );

drop policy if exists "voter can remove their own vote" on caption_votes;
create policy "voter can remove their own vote" on caption_votes
  for delete using (
    auth.uid() = voter_user_id
    and exists (
      select 1 from captions c
      join photos p on p.id = c.photo_id
      join contest_weeks cw on cw.id = p.contest_week_id
      where c.id = caption_id and cw.status = 'active'
    )
  );

-- Note: authors can still soft-delete their own caption on an archived week.
-- That's deliberate — removing your own content stays possible, and it doesn't
-- affect photo ranking. Admin removals go through the service role regardless.
