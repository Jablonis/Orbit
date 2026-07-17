alter table public.tasks
  add column if not exists completed_at timestamptz null,
  add column if not exists archived_at timestamptz null;

update public.tasks
set completed_at = updated_at
where completed and completed_at is null;

alter table public.tasks
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.tasks set created_at = now() where created_at is null;
update public.tasks set updated_at = created_at where updated_at is null;

alter table public.tasks
  alter column created_at set not null,
  alter column updated_at set not null;

update public.profiles set created_at = now() where created_at is null;
alter table public.profiles alter column created_at set not null;

alter table public.tasks
  drop constraint if exists tasks_type_check,
  add constraint tasks_type_check check (type in ('deep-work', 'admin', 'learning', 'personal')),
  drop constraint if exists tasks_complexity_check,
  add constraint tasks_complexity_check check (complexity in ('easy', 'medium', 'hard')),
  drop constraint if exists tasks_priority_check,
  add constraint tasks_priority_check check (priority in ('low', 'normal', 'high')),
  drop constraint if exists tasks_estimate_mode_check,
  add constraint tasks_estimate_mode_check check (estimate_mode in ('1hr', '2hr', '3hr', 'other')),
  drop constraint if exists tasks_estimate_minutes_check,
  add constraint tasks_estimate_minutes_check check (estimate_minutes between 0 and 1440),
  drop constraint if exists tasks_title_length_check,
  add constraint tasks_title_length_check check (char_length(title) between 1 and 200),
  drop constraint if exists tasks_category_length_check,
  add constraint tasks_category_length_check check (char_length(category) between 1 and 80),
  drop constraint if exists tasks_note_length_check,
  add constraint tasks_note_length_check check (char_length(coalesce(note, '')) <= 2000);

alter table public.tasks
  alter column time_from type time using nullif(time_from, '')::time,
  alter column time_to type time using nullif(time_to, '')::time,
  alter column time_from drop default,
  alter column time_to drop default;

create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  planned_for date null,
  estimate_minutes integer not null default 0 check (estimate_minutes between 0 and 1440)
);

insert into public.task_completions (
  user_id,
  task_id,
  completed_at,
  planned_for,
  estimate_minutes
)
select
  user_id,
  id,
  completed_at,
  coalesce(due_date, (created_at at time zone 'Europe/Bratislava')::date),
  estimate_minutes
from public.tasks
where completed_at is not null
  and not exists (
    select 1
    from public.task_completions completion
    where completion.task_id = tasks.id
      and completion.completed_at = tasks.completed_at
  );

create or replace function public.track_task_completion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.completed and (tg_op = 'INSERT' or not coalesce(old.completed, false)) then
    new.completed_at = now();
  elsif not new.completed and (tg_op = 'INSERT' or coalesce(old.completed, false)) then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create or replace function public.record_task_completion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.completed and (tg_op = 'INSERT' or not coalesce(old.completed, false)) then
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
        (new.created_at at time zone 'Europe/Bratislava')::date
      ),
      new.estimate_minutes
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_track_completion on public.tasks;
create trigger tasks_track_completion
before insert or update of completed on public.tasks
for each row execute function public.track_task_completion();

drop trigger if exists tasks_record_completion on public.tasks;
create trigger tasks_record_completion
after insert or update of completed on public.tasks
for each row execute function public.record_task_completion();

revoke all on function public.track_task_completion() from public, anon, authenticated;
revoke all on function public.record_task_completion() from public, anon, authenticated;

create table if not exists public.fitness_plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday text not null check (
    weekday in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ),
  sport text not null check (sport in ('gym', 'tennis', 'cardio', 'mobility', 'rest')),
  planned_time time null,
  planned_duration_minutes integer not null default 60 check (planned_duration_minutes between 0 and 1440),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weekday)
);

insert into public.fitness_plan_days (
  user_id,
  weekday,
  sport,
  planned_time,
  planned_duration_minutes,
  notes,
  created_at,
  updated_at
)
select
  user_id,
  weekday,
  sport,
  nullif(time, '')::time,
  duration_minutes,
  coalesce(notes, ''),
  coalesce(created_at, now()),
  coalesce(updated_at, now())
from public.fitness_weekly_plan
on conflict (user_id, weekday) do nothing;

create table if not exists public.fitness_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  performed_on date not null,
  sport text not null check (sport in ('gym', 'tennis', 'cardio', 'mobility')),
  completed boolean not null default true,
  performed_at time null,
  duration_minutes integer not null default 60 check (duration_minutes between 0 and 1440),
  quality text not null default 'medium' check (quality in ('low', 'medium', 'high')),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, performed_on)
);

insert into public.fitness_sessions (
  user_id,
  performed_on,
  sport,
  completed,
  performed_at,
  duration_minutes,
  quality,
  notes,
  created_at,
  updated_at
)
select
  user_id,
  current_date - ((extract(isodow from current_date)::integer - 1)) +
    (array_position(
      array['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      weekday
    ) - 1),
  sport,
  true,
  nullif(time, '')::time,
  duration_minutes,
  coalesce(quality, 'medium'),
  coalesce(notes, ''),
  coalesce(created_at, now()),
  coalesce(updated_at, now())
from public.fitness_weekly_plan
where completed and sport <> 'rest'
on conflict (user_id, performed_on) do nothing;

drop trigger if exists fitness_plan_days_set_updated_at on public.fitness_plan_days;
create trigger fitness_plan_days_set_updated_at
before update on public.fitness_plan_days
for each row execute function public.set_updated_at();

drop trigger if exists fitness_sessions_set_updated_at on public.fitness_sessions;
create trigger fitness_sessions_set_updated_at
before update on public.fitness_sessions
for each row execute function public.set_updated_at();

alter table public.finance_transactions
  add column if not exists archived_at timestamptz null;

update public.finance_transactions set created_at = now() where created_at is null;
update public.finance_transactions set updated_at = created_at where updated_at is null;

alter table public.finance_transactions
  alter column created_at set not null,
  alter column updated_at set not null,
  drop constraint if exists finance_status_check,
  add constraint finance_status_check check (status in ('paid', 'pending', 'scheduled')),
  drop constraint if exists finance_title_length_check,
  add constraint finance_title_length_check check (char_length(title) between 1 and 200),
  drop constraint if exists finance_category_length_check,
  add constraint finance_category_length_check check (char_length(category) between 1 and 80);

create table if not exists public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  what_worked text not null default '' check (char_length(what_worked) <= 2000),
  change_next_week text not null default '' check (char_length(change_next_week) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

drop trigger if exists weekly_reflections_set_updated_at on public.weekly_reflections;
create trigger weekly_reflections_set_updated_at
before update on public.weekly_reflections
for each row execute function public.set_updated_at();

create index if not exists tasks_user_created_idx
  on public.tasks (user_id, created_at desc)
  where archived_at is null;

create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date)
  where completed = false and archived_at is null;

create index if not exists task_completions_user_date_idx
  on public.task_completions (user_id, completed_at desc);

create index if not exists fitness_sessions_user_date_idx
  on public.fitness_sessions (user_id, performed_on desc);

create index if not exists finance_user_date_idx
  on public.finance_transactions (user_id, date desc, created_at desc)
  where archived_at is null;

alter table public.task_completions enable row level security;
alter table public.fitness_plan_days enable row level security;
alter table public.fitness_sessions enable row level security;
alter table public.weekly_reflections enable row level security;

revoke delete on public.tasks from authenticated;
revoke delete on public.finance_transactions from authenticated;
revoke all on public.fitness_weekly_plan from authenticated;

grant select, insert on public.task_completions to authenticated;
grant select, insert, update on public.fitness_plan_days to authenticated;
grant select, insert, update on public.fitness_sessions to authenticated;
grant select, insert, update on public.weekly_reflections to authenticated;

create policy "Task completions are readable by owner"
on public.task_completions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Task completions are insertable by owner"
on public.task_completions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Fitness plan days are readable by owner"
on public.fitness_plan_days for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Fitness plan days are insertable by owner"
on public.fitness_plan_days for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Fitness plan days are updateable by owner"
on public.fitness_plan_days for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Fitness sessions are readable by owner"
on public.fitness_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Fitness sessions are insertable by owner"
on public.fitness_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Fitness sessions are updateable by owner"
on public.fitness_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Fitness sessions are deletable by owner"
on public.fitness_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Weekly reflections are readable by owner"
on public.weekly_reflections for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Weekly reflections are insertable by owner"
on public.weekly_reflections for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Weekly reflections are updateable by owner"
on public.weekly_reflections for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
