-- Habits: the third pillar of a day.
--
-- A day in Orbit was tasks and training. Money was the third ring for a while
-- and it never made sense — a ledger is not something you can be consistent
-- about on a Tuesday, so a day looked unfinished for the crime of not spending
-- anything. What belongs there instead is whatever *this* person has decided
-- to do repeatedly: reading, no phone after ten, Slovak, cold showers. Orbit
-- cannot know what it is, so the account names it.
--
-- A habit is not a routine task. A routine is work that lands on the list and
-- is scored as work; a habit is a standing commitment that is either kept on a
-- day or not, and it carries its own ring. Keeping them apart is what stops
-- "read for ten minutes" from competing with "file the tax return" for the
-- same bar.
--
-- Backwards compatible: two new tables, nothing existing is read or rewritten,
-- and dropping them restores the previous behaviour exactly. An account with no
-- habits scores precisely as it does today, because a day with no habit due
-- has no habit ring to close.

-- ------------------------------------------------------------------ habits --

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 1 and 60),
  -- 0 is Sunday, matching getUTCDay, so no dialect has to translate. Empty
  -- means the habit is written down but not asked for on any day yet.
  repeat_days smallint[] not null default '{}'
    check (
      array_length(repeat_days, 1) is null
      or (
        array_length(repeat_days, 1) <= 7
        and repeat_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists habits_user_idx
  on public.habits (user_id)
  where archived_at is null;

alter table public.habits enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own"
on public.habits
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.habits from public, anon;
revoke insert, update, delete on table public.habits from authenticated;
grant select on table public.habits to authenticated;

-- ------------------------------------------------------------------ checks --

-- Kept per date rather than as a flag on the habit, for the same reason a
-- routine is: tomorrow asks again. One row per habit per day, so ticking twice
-- cannot count twice.
create table if not exists public.habit_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  done_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, done_on)
);

create index if not exists habit_checks_user_day_idx
  on public.habit_checks (user_id, done_on);

alter table public.habit_checks enable row level security;

drop policy if exists "habit_checks_select_own" on public.habit_checks;
create policy "habit_checks_select_own"
on public.habit_checks
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.habit_checks from public, anon;
revoke insert, update, delete on table public.habit_checks from authenticated;
grant select on table public.habit_checks to authenticated;

-- ----------------------------------------------------------------- writing --

-- Every write goes through a function that decides the owner itself, so a
-- client can name a habit but never whose habit it is.

create or replace function public.save_habit(
  p_id uuid,
  p_name text,
  p_repeat_days smallint[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_days smallint[] := coalesce(p_repeat_days, '{}');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if char_length(v_name) = 0 or char_length(v_name) > 60 then
    raise exception 'A habit needs a name of up to 60 characters.'
      using errcode = '22023';
  end if;

  -- Sorted and deduplicated here as well as in the client, because the check
  -- constraint is about membership and this is about the shape everything
  -- downstream reads.
  select coalesce(array_agg(distinct day order by day), '{}')
    into v_days
    from unnest(v_days) as day
   where day between 0 and 6;

  if p_id is null then
    insert into public.habits (user_id, name, repeat_days)
    values (v_user_id, v_name, v_days)
    returning id into v_id;
  else
    update public.habits
       set name = v_name,
           repeat_days = v_days,
           updated_at = now()
     where id = p_id
       and user_id = v_user_id
       and archived_at is null
    returning id into v_id;

    if v_id is null then
      raise exception 'Habit not found.' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_habit(uuid, text, smallint[]) from public, anon;
grant execute on function public.save_habit(uuid, text, smallint[]) to authenticated;

-- Archived rather than deleted: the days it was kept are part of the history
-- the score was built from, and deleting them would rewrite the past.
create or replace function public.archive_habit(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  update public.habits
     set archived_at = now(),
         updated_at = now()
   where id = p_id
     and user_id = v_user_id
     and archived_at is null
  returning id into v_id;

  if v_id is null then
    raise exception 'Habit not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.archive_habit(uuid) from public, anon;
grant execute on function public.archive_habit(uuid) to authenticated;

create or replace function public.set_habit_check(
  p_habit_id uuid,
  p_date date,
  p_done boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_habit uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_habit_id is null or p_date is null then
    raise exception 'A habit and a date are required.' using errcode = '22023';
  end if;

  -- Yesterday can still be closed off; next month cannot be pre-ticked.
  if p_date > ((now() at time zone 'UTC')::date + 1) then
    raise exception 'A habit cannot be ticked before the day arrives.'
      using errcode = '22023';
  end if;

  select id
    into v_habit
    from public.habits
   where id = p_habit_id
     and user_id = v_user_id
     and archived_at is null;

  if not found then
    raise exception 'Habit not found.' using errcode = 'P0002';
  end if;

  if p_done then
    insert into public.habit_checks (user_id, habit_id, done_on)
    values (v_user_id, p_habit_id, p_date)
    on conflict (habit_id, done_on) do nothing;
  else
    delete from public.habit_checks
     where habit_id = p_habit_id
       and user_id = v_user_id
       and done_on = p_date;
  end if;
end;
$$;

revoke all on function public.set_habit_check(uuid, date, boolean) from public, anon;
grant execute on function public.set_habit_check(uuid, date, boolean) to authenticated;

-- PostgREST matches requests against a cached schema, so until it reloads,
-- every call here is refused as unknown even though it exists.
notify pgrst, 'reload schema';
