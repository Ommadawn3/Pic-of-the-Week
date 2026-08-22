-- Friends: an undirected, instant (no accept step) friendship graph. Adding
-- someone — from their photo or via their invite link — connects you both right
-- away. Stored canonically (user_a < user_b) so there's one row per pair.

create table if not exists friendships (
  user_a uuid not null references users(id) on delete cascade,
  user_b uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table friendships enable row level security;

create policy "see own friendships" on friendships
  for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "add own friendship" on friendships
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);
create policy "remove own friendship" on friendships
  for delete using (auth.uid() = user_a or auth.uid() = user_b);

-- Add / remove a friend, always keyed off the caller (auth.uid()).
create or replace function public.add_friend(target uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null or target = auth.uid() then return; end if;
  insert into friendships(user_a, user_b)
  values (least(auth.uid(), target), greatest(auth.uid(), target))
  on conflict do nothing;
end;
$$;

create or replace function public.remove_friend(target uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null then return; end if;
  delete from friendships
  where user_a = least(auth.uid(), target) and user_b = greatest(auth.uid(), target);
end;
$$;

-- The caller's friends' ids.
create or replace function public.get_friend_ids()
returns setof uuid
language sql
stable
security invoker
as $$
  select case when user_a = auth.uid() then user_b else user_a end
  from friendships
  where user_a = auth.uid() or user_b = auth.uid();
$$;

grant execute on function public.add_friend(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.get_friend_ids() to authenticated;
