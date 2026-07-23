-- Start the next contest automatically the moment the current one ends.
--
-- Previously rollover happened only via a Wednesday cron. If a week expired at
-- any other time (or the cron was delayed/failed), the site sat on an expired
-- "active" week showing "Ended" — nobody could submit — until the next
-- Wednesday. That's exactly what happened: the week ended Thursday 04:10 UTC,
-- an hour after that week's cron had already run and correctly done nothing.
--
-- ensure_active_week() is called on page load, so the contest rolls over on the
-- first visit after expiry. It is idempotent and safe to call concurrently: the
-- one_active_week unique index means a race loses the insert and re-reads the
-- winner. The cron stays as a backstop for when nobody is visiting.

create or replace function public.ensure_active_week()
returns contest_weeks
language plpgsql
security definer
set search_path = public
as $$
declare
  w contest_weeks;
  et_now timestamp := now() at time zone 'America/New_York';
  last_end timestamptz;
  new_start timestamptz;
  new_end timestamptz;
  start_et timestamp;
  days_to_wed int;
begin
  -- Retire the current week if its window has closed.
  update contest_weeks set status = 'archived'
    where status = 'active' and ends_at <= now();

  select * into w from contest_weeks where status = 'active' limit 1;
  if found then
    return w;
  end if;

  -- Start where the last contest left off so there are no gaps; fall back to
  -- the most recent Wednesday for a brand-new install.
  select max(ends_at) into last_end from contest_weeks;
  new_start := coalesce(
    last_end,
    (date_trunc('day', et_now) - (((extract(dow from et_now)::int - 3) + 7) % 7) * interval '1 day')
      at time zone 'America/New_York'
  );

  -- Run to the next Wednesday 00:00 ET strictly after the start, so the
  -- contest snaps back onto the Wed->Wed grid even if a week ended off-cycle.
  start_et := new_start at time zone 'America/New_York';
  days_to_wed := ((3 - extract(dow from start_et)::int) + 7) % 7;
  new_end := (date_trunc('day', start_et) + (days_to_wed * interval '1 day'))
               at time zone 'America/New_York';
  if new_end <= new_start then
    new_end := new_end + interval '7 days';
  end if;

  begin
    insert into contest_weeks (starts_at, ends_at, status)
    values (new_start, new_end, 'active')
    returning * into w;
  exception when unique_violation then
    -- Another request created it first.
    select * into w from contest_weeks where status = 'active' limit 1;
  end;

  return w;
end;
$$;

-- Cron backstop delegates to the same logic.
create or replace function public.rollover_contest_week()
returns table (action text, week_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  had_active boolean;
  w contest_weeks;
begin
  select exists (select 1 from contest_weeks where status = 'active' and ends_at > now())
    into had_active;
  w := public.ensure_active_week();
  return query select (case when had_active then 'noop' else 'created' end)::text, w.id;
end;
$$;

grant execute on function public.ensure_active_week() to anon, authenticated;
