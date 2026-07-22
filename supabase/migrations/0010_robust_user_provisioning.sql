-- A real user hit "violates foreign key constraint photos_owner_user_id_fkey":
-- their auth.users row existed but the matching public.users row never got
-- created, so they could sign in but not post.
--
-- The original trigger fired only on INSERT and inserted new.email directly.
-- Supabase can create an auth row before the email is settled, in which case
-- the NOT NULL column would reject the insert and the row would silently never
-- appear. This makes provisioning resilient:
--   * tolerate a null email at insert time (backfilled on the later update)
--   * also fire on UPDATE, so the row appears/corrects itself once email lands
--   * never let a failure here block sign-up

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, created_at)
  values (new.id, coalesce(new.email, new.id::text || '@unknown.local'), coalesce(new.created_at, now()))
  on conflict (id) do update
    set email = excluded.email
    where public.users.email like '%@unknown.local';
  return new;
exception when others then
  -- Never block authentication because bookkeeping failed; the app-side
  -- ensureAppUser() safety net will provision on first write instead.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Backfill anyone already stranded by the old behaviour.
insert into public.users (id, email, created_at)
select au.id, coalesce(au.email, au.id::text || '@unknown.local'), au.created_at
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;
