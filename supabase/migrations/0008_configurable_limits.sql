-- Make participation limits app-configurable instead of hard-locked in the DB.
--
-- Previously a unique index hard-capped submissions at one photo per user per
-- week and one caption per user per photo. Those caps now live in
-- src/lib/config.ts (LIMITS, driven by MAX_PHOTOS_PER_WEEK /
-- MAX_CAPTIONS_PER_PHOTO) so they can be raised or removed while the userbase
-- grows, then tightened again later without a schema change.
drop index if exists one_photo_per_user_per_week;
drop index if exists one_caption_per_user_per_photo;

-- Voting stays strict: a user may back only ONE caption per photo. Casting a
-- vote on a different caption of the same photo moves the vote rather than
-- adding a second one. Enforced by trigger so it holds no matter the caller.
create or replace function public.enforce_one_vote_per_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from caption_votes v
  using captions c, captions c_new
  where v.caption_id = c.id
    and c_new.id = new.caption_id
    and c.photo_id = c_new.photo_id
    and v.voter_user_id = new.voter_user_id
    and v.caption_id <> new.caption_id;
  return new;
end;
$$;

drop trigger if exists one_vote_per_photo on caption_votes;
create trigger one_vote_per_photo
  before insert on caption_votes
  for each row execute function public.enforce_one_vote_per_photo();
