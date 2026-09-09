-- Importing a training history.
--
-- `log_exercise_sets` already writes sets, and it is the right function for
-- what it does: one exercise on one day, where anything not sent again is
-- removed, because correcting a session is the same act as logging it. That is
-- exactly the wrong shape for an import. Two years of training is a few hundred
-- calls at one exercise-day each, and every one of them a round trip that could
-- half-succeed.
--
-- So: one call, one transaction, and no deletes. An import adds history that
-- was lived somewhere else; it is never allowed to take away history that is
-- already here. A row that collides with a set already logged updates it, which
-- makes re-importing the same file harmless — the one thing anyone does twice
-- when they are not sure the first one worked.
--
-- Additive: nothing existing is read or rewritten, and dropping this function
-- restores the previous behaviour exactly.

create or replace function public.import_exercise_sets(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_count integer;
  v_bad boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'An import is an array of sets.' using errcode = '22023';
  end if;

  -- The client caps at the same number. This is the cap that counts.
  if jsonb_array_length(p_rows) > 2000 then
    raise exception 'An import carries up to 2000 sets.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  -- Validated here rather than trusted from the client: this function is
  -- security definer, so it is the boundary. Checked in one pass first, so a
  -- bad row fails the import with a sentence rather than with whichever
  -- constraint the insert happened to hit.
  begin
    select bool_or(
             row.performed_on is null
          or row.performed_on > ((now() at time zone 'UTC')::date + 1)
          or row.performed_on < ((now() at time zone 'UTC')::date - 3650)
          or row.exercise_id is null
          or row.exercise_id !~ '^[a-z0-9-]{1,60}$'
          or row.set_index is null or row.set_index < 1 or row.set_index > 10
          or row.reps is null or row.reps < 1 or row.reps > 200
          or row.weight_kg is null or row.weight_kg < 0 or row.weight_kg > 500
           )
      into v_bad
      from jsonb_to_recordset(p_rows) as row(
        performed_on date,
        exercise_id text,
        set_index smallint,
        reps smallint,
        weight_kg numeric
      );
  exception
    when others then
      raise exception 'A row in the import is not a set.' using errcode = '22023';
  end;

  if v_bad then
    raise exception 'A set in the import is out of range.' using errcode = '22023';
  end if;

  -- A logged set implies a training day, the same way logging one by hand
  -- does. Never clobbers a day that is already there: the sport, the quality
  -- and the notes on it are the account's, not this function's.
  insert into public.fitness_sessions (
    user_id, performed_on, sport, completed, duration_minutes, quality, notes
  )
  select distinct v_user_id, row.performed_on, 'gym', false, 0, 'medium', ''
    from jsonb_to_recordset(p_rows) as row(performed_on date)
  on conflict (user_id, performed_on) do nothing;

  -- No block: these sets were performed somewhere that had no idea what a
  -- six-week block is, and inventing one for them would be a lie in a column.
  insert into public.exercise_sets (
    user_id, performed_on, block_id, exercise_id, set_index, reps, weight_kg
  )
  -- `distinct on` because `on conflict do update` refuses to touch the same
  -- row twice in one statement: two identical rows in a file would otherwise
  -- take the whole import down with an error about the file, not the sets.
  select distinct on (row.performed_on, row.exercise_id, row.set_index)
    v_user_id,
    row.performed_on,
    null,
    row.exercise_id,
    row.set_index,
    row.reps,
    row.weight_kg
    from jsonb_to_recordset(p_rows) as row(
      performed_on date,
      exercise_id text,
      set_index smallint,
      reps smallint,
      weight_kg numeric
    )
  order by row.performed_on, row.exercise_id, row.set_index
  on conflict (user_id, performed_on, exercise_id, set_index)
  do update set
    reps = excluded.reps,
    weight_kg = excluded.weight_kg,
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.import_exercise_sets(jsonb) from public, anon;
grant execute on function public.import_exercise_sets(jsonb) to authenticated;
