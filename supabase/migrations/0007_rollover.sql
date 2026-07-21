-- Weekly contest rollover. Contests run Wednesday 00:00 -> Wednesday 00:00,
-- America/New_York. This function archives any active week that has ended and
-- ensures an active week exists for the current Wed..Wed window. Idempotent —
-- safe to call on a schedule (and catches up if a run was missed).

create or replace function public.rollover_contest_week()
returns table (action text, week_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  et_now timestamp := now() at time zone 'America/New_York';
  days_since_wed int := ((extract(dow from et_now)::int - 3) + 7) % 7; -- 3 = Wednesday
  cur_start timestamptz;
  cur_end timestamptz;
  existing uuid;
begin
  -- Wednesday 00:00 ET of the current contest window, back as a timestamptz.
  cur_start := (date_trunc('day', et_now) - (days_since_wed * interval '1 day'))
                 at time zone 'America/New_York';
  cur_end := cur_start + interval '7 days';

  -- Archive active weeks whose window has ended.
  update contest_weeks set status = 'archived'
    where status = 'active' and ends_at <= now_ts;

  select id into existing from contest_weeks where status = 'active' limit 1;
  if existing is not null then
    return query select 'noop'::text, existing;
    return;
  end if;

  insert into contest_weeks (starts_at, ends_at, status)
  values (cur_start, cur_end, 'active')
  returning id into existing;
  return query select 'created'::text, existing;
end;
$$;
