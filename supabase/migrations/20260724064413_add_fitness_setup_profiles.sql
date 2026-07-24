create table if not exists public.fitness_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text not null check (
    goal in (
      'general_fitness', 'strength', 'muscle_gain',
      'conditioning', 'mobility', 'sport_support'
    )
  ),
  experience text not null check (
    experience in ('beginner', 'intermediate', 'advanced')
  ),
  equipment text[] not null check (
    cardinality(equipment) between 1 and 5
    and equipment <@ array[
      'bodyweight', 'dumbbells', 'bands', 'full_gym', 'cardio'
    ]::text[]
  ),
  available_days text[] not null check (
    cardinality(available_days) between 1 and 7
    and available_days <@ array[
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    ]::text[]
  ),
  session_length_minutes integer not null check (
    session_length_minutes in (20, 30, 45, 60, 75, 90)
  ),
  exercises_to_avoid text not null default ''
    check (char_length(exercises_to_avoid) <= 1000),
  template_id text not null check (
    template_id in (
      'general_starter', 'strength_starter', 'muscle_starter',
      'conditioning_starter', 'mobility_starter', 'sport_starter'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fitness_profiles enable row level security;

drop policy if exists "fitness_profiles_select_own"
  on public.fitness_profiles;
create policy "fitness_profiles_select_own"
on public.fitness_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.fitness_profiles from public, anon;
revoke insert, update, delete on table public.fitness_profiles
  from authenticated;
grant select on table public.fitness_profiles to authenticated;

create or replace function public.configure_fitness_plan(
  p_effective_from date,
  p_profile jsonb,
  p_plan jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal text := p_profile ->> 'goal';
  v_experience text := p_profile ->> 'experience';
  v_equipment text[];
  v_available_days text[];
  v_session_length integer;
  v_avoid text := coalesce(p_profile ->> 'exercises_to_avoid', '');
  v_template_id text := p_profile ->> 'template_id';
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception 'A fitness setup profile is required.'
      using errcode = '22023';
  end if;

  select coalesce(array_agg(value), array[]::text[])
  into v_equipment
  from jsonb_array_elements_text(p_profile -> 'equipment');

  select coalesce(array_agg(value), array[]::text[])
  into v_available_days
  from jsonb_array_elements_text(p_profile -> 'available_days');

  begin
    v_session_length := (p_profile ->> 'session_length_minutes')::integer;
  exception when others then
    raise exception 'Invalid session length.' using errcode = '22023';
  end;

  if v_goal not in (
      'general_fitness', 'strength', 'muscle_gain',
      'conditioning', 'mobility', 'sport_support'
    )
    or v_experience not in ('beginner', 'intermediate', 'advanced')
    or cardinality(v_equipment) not between 1 and 5
    or not v_equipment <@ array[
      'bodyweight', 'dumbbells', 'bands', 'full_gym', 'cardio'
    ]::text[]
    or cardinality(v_available_days) not between 1 and 7
    or not v_available_days <@ array[
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    ]::text[]
    or v_session_length not in (20, 30, 45, 60, 75, 90)
    or char_length(v_avoid) > 1000
    or v_template_id not in (
      'general_starter', 'strength_starter', 'muscle_starter',
      'conditioning_starter', 'mobility_starter', 'sport_starter'
    )
  then
    raise exception 'The fitness setup contains invalid choices.'
      using errcode = '22023';
  end if;

  if p_effective_from is null
    or p_plan is null
    or jsonb_typeof(p_plan) <> 'array'
    or jsonb_array_length(p_plan) <> 7
    or (
      select count(distinct plan_day.weekday) <> 7
        or count(*) <> 7
        or bool_or(
          plan_day.weekday not in (
            'monday', 'tuesday', 'wednesday', 'thursday',
            'friday', 'saturday', 'sunday'
          )
          or plan_day.sport not in (
            'gym', 'tennis', 'cardio', 'mobility', 'rest'
          )
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
    )
  then
    raise exception 'A complete valid fitness plan is required.'
      using errcode = '22023';
  end if;

  insert into public.fitness_profiles (
    user_id, goal, experience, equipment, available_days,
    session_length_minutes, exercises_to_avoid, template_id
  )
  values (
    v_user_id, v_goal, v_experience, v_equipment, v_available_days,
    v_session_length, v_avoid, v_template_id
  )
  on conflict (user_id) do update
  set
    goal = excluded.goal,
    experience = excluded.experience,
    equipment = excluded.equipment,
    available_days = excluded.available_days,
    session_length_minutes = excluded.session_length_minutes,
    exercises_to_avoid = excluded.exercises_to_avoid,
    template_id = excluded.template_id,
    updated_at = now();

  perform set_config(
    'orbit.fitness_plan_effective_from',
    p_effective_from::text,
    true
  );

  insert into public.fitness_plan_days (
    user_id, weekday, sport, planned_time,
    planned_duration_minutes, notes
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

revoke all on function public.configure_fitness_plan(date, jsonb, jsonb)
  from public, anon;
grant execute on function public.configure_fitness_plan(date, jsonb, jsonb)
  to authenticated;
