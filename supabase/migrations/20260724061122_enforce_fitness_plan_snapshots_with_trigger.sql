-- Enforce plan history for every owner-scoped write without exposing a
-- SECURITY DEFINER RPC. The trigger function is not directly executable.

create or replace function public.snapshot_fitness_plan_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_effective_from date;
  v_requested_date text;
  v_time_zone text;
begin
  v_requested_date := current_setting(
    'orbit.fitness_plan_effective_from',
    true
  );

  if v_requested_date ~ '^\d{4}-\d{2}-\d{2}$' then
    v_effective_from := v_requested_date::date;
  else
    select case
      when profile.dashboard_preferences #>> '{regional,timeZone}' in (
        'America/Los_Angeles',
        'America/New_York',
        'Europe/Bratislava',
        'Europe/London',
        'UTC'
      )
        then profile.dashboard_preferences #>> '{regional,timeZone}'
      else 'Europe/Bratislava'
    end
    into v_time_zone
    from public.profiles as profile
    where profile.id = new.user_id;

    v_effective_from := timezone(
      coalesce(v_time_zone, 'Europe/Bratislava'),
      now()
    )::date;
  end if;

  insert into public.fitness_plan_versions (
    user_id,
    weekday,
    effective_from,
    sport,
    planned_time,
    planned_duration_minutes,
    notes
  )
  values (
    new.user_id,
    new.weekday,
    v_effective_from,
    new.sport,
    new.planned_time,
    new.planned_duration_minutes,
    new.notes
  )
  on conflict (user_id, weekday, effective_from) do update
  set
    sport = excluded.sport,
    planned_time = excluded.planned_time,
    planned_duration_minutes = excluded.planned_duration_minutes,
    notes = excluded.notes;

  return new;
end;
$$;

revoke all on function public.snapshot_fitness_plan_day()
  from public, anon, authenticated;

drop trigger if exists fitness_plan_day_snapshot
  on public.fitness_plan_days;
create trigger fitness_plan_day_snapshot
after insert or update of sport, planned_time, planned_duration_minutes, notes
on public.fitness_plan_days
for each row execute function public.snapshot_fitness_plan_day();

create or replace function public.set_fitness_plan_day(
  p_weekday text,
  p_sport text,
  p_effective_from date
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_effective_from is null
    or p_weekday not in (
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    )
    or p_sport not in ('gym', 'tennis', 'cardio', 'mobility', 'rest')
  then
    raise exception 'Invalid fitness plan day.' using errcode = '22023';
  end if;

  perform set_config(
    'orbit.fitness_plan_effective_from',
    p_effective_from::text,
    true
  );

  insert into public.fitness_plan_days (
    user_id,
    weekday,
    sport
  )
  values (
    v_user_id,
    p_weekday,
    p_sport
  )
  on conflict (user_id, weekday) do update
  set sport = excluded.sport;

  return true;
end;
$$;

create or replace function public.replace_fitness_plan(
  p_effective_from date,
  p_plan jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_effective_from is null
    or p_plan is null
    or jsonb_typeof(p_plan) <> 'array'
    or jsonb_array_length(p_plan) <> 7
  then
    raise exception 'A complete dated fitness plan is required.' using errcode = '22023';
  end if;

  if (
    select count(distinct plan_day.weekday) <> 7
      or count(*) <> 7
      or bool_or(
        plan_day.weekday not in (
          'monday', 'tuesday', 'wednesday', 'thursday',
          'friday', 'saturday', 'sunday'
        )
        or plan_day.sport not in ('gym', 'tennis', 'cardio', 'mobility', 'rest')
        or plan_day.planned_duration_minutes not between 0 and 1440
        or char_length(coalesce(plan_day.notes, '')) > 2000
      )
    from jsonb_to_recordset(p_plan) as plan_day(
      weekday text,
      sport text,
      planned_time time,
      planned_duration_minutes integer,
      notes text
    )
  ) then
    raise exception 'The fitness plan contains invalid days.' using errcode = '22023';
  end if;

  perform set_config(
    'orbit.fitness_plan_effective_from',
    p_effective_from::text,
    true
  );

  insert into public.fitness_plan_days (
    user_id,
    weekday,
    sport,
    planned_time,
    planned_duration_minutes,
    notes
  )
  select
    v_user_id,
    plan_day.weekday,
    plan_day.sport,
    plan_day.planned_time,
    plan_day.planned_duration_minutes,
    coalesce(plan_day.notes, '')
  from jsonb_to_recordset(p_plan) as plan_day(
    weekday text,
    sport text,
    planned_time time,
    planned_duration_minutes integer,
    notes text
  )
  on conflict (user_id, weekday) do update
  set
    sport = excluded.sport,
    planned_time = excluded.planned_time,
    planned_duration_minutes = excluded.planned_duration_minutes,
    notes = excluded.notes;

  return true;
end;
$$;

grant insert, update on table public.fitness_plan_days
  to authenticated;
grant select on table public.fitness_plan_versions
  to authenticated;

revoke all on function public.set_fitness_plan_day(text, text, date)
  from public, anon;
revoke all on function public.replace_fitness_plan(date, jsonb)
  from public, anon;
grant execute on function public.set_fitness_plan_day(text, text, date)
  to authenticated;
grant execute on function public.replace_fitness_plan(date, jsonb)
  to authenticated;
