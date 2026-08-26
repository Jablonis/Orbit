-- Routines.
--
-- Most of a day is the same every week: the morning, the commute, the two
-- things that always need doing on a Monday. Typing those in every morning is
-- work about work, and it is the reason a planner gets abandoned in week two.
--
-- A routine is not a new kind of thing. It is a task with the days it repeats
-- on, and `task_completions.planned_for` already lets one task be completed on
-- many dates — which is exactly what a repeating task needs and what the
-- scoring engine already reads. So this is one column, not a second table with
-- its own idea of what is due today.
--
-- Backwards compatible: the column defaults to empty, which means "not a
-- routine", so every existing task behaves exactly as it did.

alter table public.tasks
  add column if not exists repeat_days smallint[] not null default '{}';

-- 0 is Sunday, matching JavaScript's getUTCDay, so no dialect has to translate.
alter table public.tasks
  drop constraint if exists tasks_repeat_days_valid;
alter table public.tasks
  add constraint tasks_repeat_days_valid check (
    array_length(repeat_days, 1) is null
    or (
      array_length(repeat_days, 1) <= 7
      and repeat_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    )
  );

comment on column public.tasks.repeat_days is
  'Weekdays this task repeats on, 0 = Sunday. Empty means a one-off task.';

-- Ticking a routine.
--
-- A one-off task is done once and `tasks.completed` says so. A routine is done
-- again tomorrow, so the flag is the wrong place for it: the answer is per
-- date, and `task_completions` already holds exactly that shape. So a routine
-- never flips `completed`; ticking it writes the completion for one day, and
-- unticking it removes that day again.
--
-- `task_completions` grants insert but no delete, and unticking has to be
-- possible, so both halves go through one `security definer` function keyed on
-- `auth.uid()` — the same shape every other write in this schema uses.

create or replace function public.set_routine_completion(
  p_task_id uuid,
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
  v_estimate integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_task_id is null or p_date is null then
    raise exception 'A task and a date are required.' using errcode = '22023';
  end if;

  -- Yesterday can still be closed off; next month cannot be pre-ticked.
  if p_date > ((now() at time zone 'UTC')::date + 1) then
    raise exception 'A routine cannot be ticked before the day arrives.'
      using errcode = '22023';
  end if;

  select estimate_minutes
    into v_estimate
    from public.tasks
   where id = p_task_id
     and user_id = v_user_id
     and archived_at is null;

  if not found then
    raise exception 'Task not found.' using errcode = 'P0002';
  end if;

  if p_done then
    insert into public.task_completions (
      user_id,
      task_id,
      completed_at,
      planned_for,
      estimate_minutes
    )
    select v_user_id, p_task_id, now(), p_date, coalesce(v_estimate, 0)
    where not exists (
      select 1
        from public.task_completions existing
       where existing.task_id = p_task_id
         and existing.user_id = v_user_id
         and existing.planned_for = p_date
    );
  else
    delete from public.task_completions
     where task_id = p_task_id
       and user_id = v_user_id
       and planned_for = p_date;
  end if;
end;
$$;

revoke all on function public.set_routine_completion(uuid, date, boolean)
  from public, anon;
grant execute on function public.set_routine_completion(uuid, date, boolean)
  to authenticated;
