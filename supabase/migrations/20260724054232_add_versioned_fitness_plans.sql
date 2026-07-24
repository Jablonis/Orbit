-- Preserve the plan that applied to each historical calendar date.
-- Current reusable weekday rows remain in fitness_plan_days; every change also
-- records an effective-dated version for productivity history.

create table public.fitness_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday text not null check (
    weekday in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ),
  effective_from date not null,
  sport text not null check (sport in ('gym', 'tennis', 'cardio', 'mobility', 'rest')),
  planned_time time null,
  planned_duration_minutes integer not null default 60 check (
    planned_duration_minutes between 0 and 1440
  ),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, weekday, effective_from)
);

create index fitness_plan_versions_user_effective_idx
  on public.fitness_plan_versions (user_id, weekday, effective_from desc);

alter table public.fitness_plan_versions enable row level security;

grant select, insert, update on public.fitness_plan_versions to authenticated;

create policy "Fitness plan versions are readable by owner"
on public.fitness_plan_versions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Fitness plan versions are insertable by owner"
on public.fitness_plan_versions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Fitness plan versions are updateable by owner"
on public.fitness_plan_versions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into public.fitness_plan_versions (
  user_id,
  weekday,
  effective_from,
  sport,
  planned_time,
  planned_duration_minutes,
  notes
)
select
  user_id,
  weekday,
  date '1970-01-01',
  sport,
  planned_time,
  planned_duration_minutes,
  notes
from public.fitness_plan_days
on conflict (user_id, weekday, effective_from) do nothing;

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

  insert into public.fitness_plan_versions (
    user_id,
    weekday,
    effective_from,
    sport,
    planned_time,
    planned_duration_minutes,
    notes
  )
  select
    user_id,
    weekday,
    p_effective_from,
    sport,
    planned_time,
    planned_duration_minutes,
    notes
  from public.fitness_plan_days
  where user_id = v_user_id
    and weekday = p_weekday
  on conflict (user_id, weekday, effective_from) do update
  set
    sport = excluded.sport,
    planned_time = excluded.planned_time,
    planned_duration_minutes = excluded.planned_duration_minutes,
    notes = excluded.notes;

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

  insert into public.fitness_plan_versions (
    user_id,
    weekday,
    effective_from,
    sport,
    planned_time,
    planned_duration_minutes,
    notes
  )
  select
    user_id,
    weekday,
    p_effective_from,
    sport,
    planned_time,
    planned_duration_minutes,
    notes
  from public.fitness_plan_days
  where user_id = v_user_id
  on conflict (user_id, weekday, effective_from) do update
  set
    sport = excluded.sport,
    planned_time = excluded.planned_time,
    planned_duration_minutes = excluded.planned_duration_minutes,
    notes = excluded.notes;

  return true;
end;
$$;

revoke all on function public.set_fitness_plan_day(text, text, date)
  from public, anon;
revoke all on function public.replace_fitness_plan(date, jsonb)
  from public, anon;
grant execute on function public.set_fitness_plan_day(text, text, date)
  to authenticated;
grant execute on function public.replace_fitness_plan(date, jsonb)
  to authenticated;

create or replace function public.record_task_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_time_zone text;
begin
  if new.completed and (tg_op = 'INSERT' or not coalesce(old.completed, false)) then
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

    insert into public.task_completions (
      user_id,
      task_id,
      completed_at,
      planned_for,
      estimate_minutes
    ) values (
      new.user_id,
      new.id,
      new.completed_at,
      coalesce(
        new.due_date,
        timezone(coalesce(v_time_zone, 'Europe/Bratislava'), new.created_at)::date
      ),
      new.estimate_minutes
    );
  end if;
  return new;
end;
$$;

revoke all on function public.record_task_completion()
  from public, anon, authenticated;
