-- The training programme: blocks, their prescription, and the sets performed.
--
-- Fitness could say whether you trained. It could not say what you did, so it
-- could not say whether you were getting stronger — and a planner that watches
-- you go to the gym twice a week for a year without noticing you still bench
-- the same weight is not much of a planner.
--
-- A block is six weeks of the same sessions. Both halves matter: the same
-- sessions, because a week you cannot compare to last week tells you nothing;
-- six weeks, because that is about as long as one shape keeps paying. The
-- shape itself — which muscle group on which day, by which movement — lives in
-- the code, along with the exercise library, for the same reason the routine
-- kit does: it is shared reference data, not anyone's data. So `exercise_id`
-- and `split_id` are validated slugs here, not foreign keys and not enums; a
-- new exercise is a code change, not a migration, and a retired one leaves the
-- history it appears in perfectly readable.
--
-- The prescription is written down rather than derived, which is the exception
-- to this codebase's rule and is the point of the feature: a commitment
-- recomputed from a profile that changed in week three is not a commitment.
--
-- On security: the fitness plan functions next door are deliberately
-- `security invoker`, guarded by a definer trigger that snapshots every plan
-- row. Nothing here has a trigger to hide behind, so these follow the newer
-- convention instead — `security definer` with a pinned `search_path`, tables
-- revoked from everyone and granted `select` only, and the owner taken from
-- `auth.uid()` rather than from anything a client sends.
--
-- Backwards compatible: four new tables, nothing existing is read or rewritten,
-- and dropping them restores the previous behaviour exactly. The day's score
-- does not consult any of this — a set logged is not a ring closed.

-- ------------------------------------------------------------------ blocks --

create table if not exists public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_index integer not null check (block_index between 1 and 1000),
  split_id text not null check (split_id ~ '^[a-z0-9_]{1,40}$'),
  started_on date not null,
  weeks integer not null default 6 check (weeks between 2 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, block_index)
);

-- One live block per account, enforced by the database rather than by hope.
create unique index if not exists training_blocks_active_idx
  on public.training_blocks (user_id)
  where archived_at is null;

create index if not exists training_blocks_user_idx
  on public.training_blocks (user_id, started_on desc);

alter table public.training_blocks enable row level security;

drop policy if exists "training_blocks_select_own" on public.training_blocks;
create policy "training_blocks_select_own"
on public.training_blocks
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.training_blocks from public, anon;
revoke insert, update, delete on table public.training_blocks from authenticated;
grant select on table public.training_blocks to authenticated;

-- ---------------------------------------------------------------- sessions --

-- One row per training day of the block. The weekday lives here rather than on
-- the exercises so that moving a session is one row, and so the day a session
-- belongs to survives a change to the weekly plan.
create table if not exists public.training_block_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id uuid not null references public.training_blocks(id) on delete cascade,
  slot smallint not null check (slot between 0 and 6),
  weekday text not null check (
    weekday in (
      'monday', 'tuesday', 'wednesday',
      'thursday', 'friday', 'saturday', 'sunday'
    )
  ),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (block_id, slot),
  unique (block_id, weekday)
);

create index if not exists training_block_sessions_user_idx
  on public.training_block_sessions (user_id, block_id);

alter table public.training_block_sessions enable row level security;

drop policy if exists "training_block_sessions_select_own"
  on public.training_block_sessions;
create policy "training_block_sessions_select_own"
on public.training_block_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.training_block_sessions from public, anon;
revoke insert, update, delete on table public.training_block_sessions
  from authenticated;
grant select on table public.training_block_sessions to authenticated;

-- --------------------------------------------------------------- exercises --

create table if not exists public.training_block_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null
    references public.training_block_sessions(id) on delete cascade,
  position smallint not null check (position between 0 and 19),
  -- The library lives in the code, so this is a slug, not a foreign key.
  exercise_id text not null check (exercise_id ~ '^[a-z0-9-]{1,60}$'),
  target_sets smallint not null check (target_sets between 1 and 10),
  rep_low smallint not null check (rep_low between 1 and 50),
  rep_high smallint not null check (rep_high between 1 and 50),
  created_at timestamptz not null default now(),
  check (rep_high >= rep_low),
  unique (session_id, position)
);

create index if not exists training_block_exercises_user_idx
  on public.training_block_exercises (user_id, session_id);

alter table public.training_block_exercises enable row level security;

drop policy if exists "training_block_exercises_select_own"
  on public.training_block_exercises;
create policy "training_block_exercises_select_own"
on public.training_block_exercises
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.training_block_exercises from public, anon;
revoke insert, update, delete on table public.training_block_exercises
  from authenticated;
grant select on table public.training_block_exercises to authenticated;

-- -------------------------------------------------------------------- sets --

-- Hangs off the day, not off a session row. One fitness session per day is
-- already a hard constraint next door, and a foreign key here would forbid
-- logging a set before the day has been ticked done — which is the order
-- everyone actually does it in.
create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  performed_on date not null,
  -- Nulled rather than deleted when a block goes: the set still happened.
  block_id uuid references public.training_blocks(id) on delete set null,
  exercise_id text not null check (exercise_id ~ '^[a-z0-9-]{1,60}$'),
  set_index smallint not null check (set_index between 1 and 10),
  reps smallint not null check (reps between 1 and 200),
  weight_kg numeric(6, 2) not null default 0
    check (weight_kg between 0 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, performed_on, exercise_id, set_index)
);

-- What "last time" reads, and it reads it once per exercise per page.
create index if not exists exercise_sets_user_exercise_idx
  on public.exercise_sets (user_id, exercise_id, performed_on desc);

create index if not exists exercise_sets_user_day_idx
  on public.exercise_sets (user_id, performed_on desc);

alter table public.exercise_sets enable row level security;

drop policy if exists "exercise_sets_select_own" on public.exercise_sets;
create policy "exercise_sets_select_own"
on public.exercise_sets
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.exercise_sets from public, anon;
revoke insert, update, delete on table public.exercise_sets from authenticated;
grant select on table public.exercise_sets to authenticated;

-- ----------------------------------------------------------------- writing --

-- Starting a block archives the one before it and writes the whole
-- prescription in a single call, so there is no moment when an account has two
-- live blocks or a block with half its sessions.
create or replace function public.start_training_block(
  p_split_id text,
  p_started_on date,
  p_weeks integer,
  p_sessions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_block_id uuid;
  v_block_index integer;
  v_session jsonb;
  v_session_id uuid;
  v_exercise jsonb;
  v_slot smallint;
  v_exercise_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_split_id is null or p_split_id !~ '^[a-z0-9_]{1,40}$' then
    raise exception 'A block needs a split.' using errcode = '22023';
  end if;

  if p_started_on is null
     or p_started_on > ((now() at time zone 'UTC')::date + 7)
     or p_started_on < ((now() at time zone 'UTC')::date - 365) then
    raise exception 'A block starts within the year around today.'
      using errcode = '22023';
  end if;

  if p_weeks is null or p_weeks < 2 or p_weeks > 12 then
    raise exception 'A block runs between two and twelve weeks.'
      using errcode = '22023';
  end if;

  if p_sessions is null
     or jsonb_typeof(p_sessions) <> 'array'
     or jsonb_array_length(p_sessions) < 2
     or jsonb_array_length(p_sessions) > 6 then
    raise exception 'A block has between two and six training days.'
      using errcode = '22023';
  end if;

  update public.training_blocks
     set archived_at = now(),
         updated_at = now()
   where user_id = v_user_id
     and archived_at is null;

  select coalesce(max(block_index), 0) + 1
    into v_block_index
    from public.training_blocks
   where user_id = v_user_id;

  insert into public.training_blocks (
    user_id, block_index, split_id, started_on, weeks
  )
  values (v_user_id, v_block_index, p_split_id, p_started_on, p_weeks)
  returning id into v_block_id;

  for v_session in select * from jsonb_array_elements(p_sessions)
  loop
    if jsonb_typeof(v_session -> 'slot') <> 'number'
       or jsonb_typeof(v_session -> 'weekday') <> 'string'
       or jsonb_typeof(v_session -> 'label') <> 'string'
       or jsonb_typeof(v_session -> 'exercises') <> 'array' then
      raise exception 'A training day needs a slot, a weekday and exercises.'
        using errcode = '22023';
    end if;

    v_slot := (v_session ->> 'slot')::smallint;

    begin
      insert into public.training_block_sessions (
        user_id, block_id, slot, weekday, label
      )
      values (
        v_user_id,
        v_block_id,
        v_slot,
        v_session ->> 'weekday',
        btrim(v_session ->> 'label')
      )
      returning id into v_session_id;
    exception
      when check_violation or unique_violation or invalid_text_representation then
        raise exception 'A training day is out of shape.' using errcode = '22023';
    end;

    for v_exercise in select * from jsonb_array_elements(v_session -> 'exercises')
    loop
      v_exercise_count := v_exercise_count + 1;
      if v_exercise_count > 80 then
        raise exception 'A block holds at most eighty exercises.'
          using errcode = '22023';
      end if;

      begin
        insert into public.training_block_exercises (
          user_id, session_id, position, exercise_id,
          target_sets, rep_low, rep_high
        )
        values (
          v_user_id,
          v_session_id,
          (v_exercise ->> 'position')::smallint,
          v_exercise ->> 'exercise_id',
          (v_exercise ->> 'target_sets')::smallint,
          (v_exercise ->> 'rep_low')::smallint,
          (v_exercise ->> 'rep_high')::smallint
        );
      exception
        when check_violation
          or unique_violation
          or not_null_violation
          or invalid_text_representation then
          raise exception 'An exercise in the block is out of shape.'
            using errcode = '22023';
      end;
    end loop;
  end loop;

  if v_exercise_count = 0 then
    raise exception 'A block needs at least one exercise.' using errcode = '22023';
  end if;

  return v_block_id;
end;
$$;

revoke all on function public.start_training_block(text, date, integer, jsonb)
  from public, anon;
grant execute on function public.start_training_block(text, date, integer, jsonb)
  to authenticated;

-- One call per exercise: the sets that were done, in order. Anything logged
-- earlier for that exercise on that day and not sent again is removed, so
-- correcting a session is the same act as logging it.
create or replace function public.log_exercise_sets(
  p_performed_on date,
  p_exercise_id text,
  p_block_id uuid,
  p_sets jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_indexes smallint[] := '{}';
  v_row jsonb;
  v_index smallint;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_performed_on is null
     or p_performed_on > ((now() at time zone 'UTC')::date + 1)
     or p_performed_on < ((now() at time zone 'UTC')::date - 3650) then
    raise exception 'A set is logged on a day that has happened.'
      using errcode = '22023';
  end if;

  if p_exercise_id is null or p_exercise_id !~ '^[a-z0-9-]{1,60}$' then
    raise exception 'That is not an exercise.' using errcode = '22023';
  end if;

  if p_sets is null
     or jsonb_typeof(p_sets) <> 'array'
     or jsonb_array_length(p_sets) > 10 then
    raise exception 'An exercise carries up to ten sets.' using errcode = '22023';
  end if;

  if p_block_id is not null then
    perform 1
       from public.training_blocks
      where id = p_block_id
        and user_id = v_user_id;
    if not found then
      raise exception 'Training block not found.' using errcode = 'P0002';
    end if;
  end if;

  for v_row in select * from jsonb_array_elements(p_sets)
  loop
    if jsonb_typeof(v_row -> 'set_index') <> 'number'
       or jsonb_typeof(v_row -> 'reps') <> 'number'
       or jsonb_typeof(v_row -> 'weight_kg') <> 'number' then
      raise exception 'A set needs an index, reps and a weight.'
        using errcode = '22023';
    end if;

    v_index := (v_row ->> 'set_index')::smallint;
    if v_index = any (v_indexes) then
      raise exception 'The same set was sent twice.' using errcode = '22023';
    end if;
    v_indexes := v_indexes || v_index;
  end loop;

  -- A logged set implies a training day, so the day exists to be ticked done
  -- later. Never clobbers a day that is already there: the sport and the
  -- quality on it are the account's, not this function's.
  insert into public.fitness_sessions (
    user_id, performed_on, sport, completed, duration_minutes, quality, notes
  )
  values (v_user_id, p_performed_on, 'gym', false, 0, 'medium', '')
  on conflict (user_id, performed_on) do nothing;

  begin
    insert into public.exercise_sets (
      user_id, performed_on, block_id, exercise_id, set_index, reps, weight_kg
    )
    select
      v_user_id,
      p_performed_on,
      p_block_id,
      p_exercise_id,
      (row ->> 'set_index')::smallint,
      (row ->> 'reps')::smallint,
      (row ->> 'weight_kg')::numeric
    from jsonb_array_elements(p_sets) as row
    on conflict (user_id, performed_on, exercise_id, set_index)
    do update set
      reps = excluded.reps,
      weight_kg = excluded.weight_kg,
      block_id = excluded.block_id,
      updated_at = now();
  exception
    when check_violation
      or numeric_value_out_of_range
      or invalid_text_representation then
      raise exception 'A set is out of range.' using errcode = '22023';
  end;

  delete from public.exercise_sets
   where user_id = v_user_id
     and performed_on = p_performed_on
     and exercise_id = p_exercise_id
     and not (set_index = any (v_indexes));
end;
$$;

revoke all on function public.log_exercise_sets(date, text, uuid, jsonb)
  from public, anon;
grant execute on function public.log_exercise_sets(date, text, uuid, jsonb)
  to authenticated;

create or replace function public.clear_exercise_sets(
  p_performed_on date,
  p_exercise_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_performed_on is null
     or p_exercise_id is null
     or p_exercise_id !~ '^[a-z0-9-]{1,60}$' then
    raise exception 'A day and an exercise are required.' using errcode = '22023';
  end if;

  delete from public.exercise_sets
   where user_id = v_user_id
     and performed_on = p_performed_on
     and exercise_id = p_exercise_id;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    raise exception 'Nothing was logged for that exercise.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.clear_exercise_sets(date, text) from public, anon;
grant execute on function public.clear_exercise_sets(date, text) to authenticated;

-- Ending a block without starting the next one: the programme is over, the
-- sets performed under it stay exactly where they are.
create or replace function public.archive_training_block(p_id uuid)
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

  update public.training_blocks
     set archived_at = now(),
         updated_at = now()
   where id = p_id
     and user_id = v_user_id
     and archived_at is null
  returning id into v_id;

  if v_id is null then
    raise exception 'Training block not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.archive_training_block(uuid) from public, anon;
grant execute on function public.archive_training_block(uuid) to authenticated;

notify pgrst, 'reload schema';
