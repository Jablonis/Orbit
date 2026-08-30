-- Orbit: full schema parity.
--
-- Every migration the app has ever shipped, in order, made safe to run on a
-- database at ANY point of drift — including one that already has everything,
-- and one that has nothing. Running it twice is a no-op.
--
-- Why this file exists: the production database is migrated by pasting SQL
-- into the Supabase editor, one file at a time, and three separate outages in
-- one week came from a migration that never made the trip. This is the whole
-- schema in one paste, so "which ones did I run?" stops being a question.
--
-- Generated from supabase/migrations/ — do not edit by hand; regenerate.


-- ==================================================================
-- 20260715120000_create_orbit_app_schema.sql
-- ==================================================================
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  type text not null,
  complexity text not null,
  priority text not null,
  estimate_mode text not null,
  estimate_minutes integer not null default 60,
  time_from text default '',
  time_to text default '',
  due_date date null,
  note text default '',
  completed boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.fitness_weekly_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday text not null,
  sport text not null,
  completed boolean not null default false,
  time text default '',
  duration_minutes integer not null default 60,
  quality text default 'medium',
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, weekday)
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null,
  category text not null,
  amount numeric not null,
  status text not null default 'paid',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists fitness_weekly_plan_set_updated_at on public.fitness_weekly_plan;
create trigger fitness_weekly_plan_set_updated_at
before update on public.fitness_weekly_plan
for each row execute function public.set_updated_at();

drop trigger if exists finance_transactions_set_updated_at on public.finance_transactions;
create trigger finance_transactions_set_updated_at
before update on public.finance_transactions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.fitness_weekly_plan enable row level security;
alter table public.finance_transactions enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.fitness_weekly_plan to authenticated;
grant select, insert, update, delete on public.finance_transactions to authenticated;

drop policy if exists "Profiles are readable by owner" on public.profiles;
drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Profiles are updateable by owner" on public.profiles;
drop policy if exists "Profiles are updateable by owner" on public.profiles;
create policy "Profiles are updateable by owner"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Profiles are deletable by owner" on public.profiles;
drop policy if exists "Profiles are deletable by owner" on public.profiles;
create policy "Profiles are deletable by owner"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Tasks are readable by owner" on public.tasks;
drop policy if exists "Tasks are readable by owner" on public.tasks;
create policy "Tasks are readable by owner"
on public.tasks for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Tasks are insertable by owner" on public.tasks;
drop policy if exists "Tasks are insertable by owner" on public.tasks;
create policy "Tasks are insertable by owner"
on public.tasks for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Tasks are updateable by owner" on public.tasks;
drop policy if exists "Tasks are updateable by owner" on public.tasks;
create policy "Tasks are updateable by owner"
on public.tasks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Tasks are deletable by owner" on public.tasks;
drop policy if exists "Tasks are deletable by owner" on public.tasks;
create policy "Tasks are deletable by owner"
on public.tasks for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are readable by owner" on public.fitness_weekly_plan;
drop policy if exists "Fitness rows are readable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are readable by owner"
on public.fitness_weekly_plan for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are insertable by owner" on public.fitness_weekly_plan;
drop policy if exists "Fitness rows are insertable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are insertable by owner"
on public.fitness_weekly_plan for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are updateable by owner" on public.fitness_weekly_plan;
drop policy if exists "Fitness rows are updateable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are updateable by owner"
on public.fitness_weekly_plan for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are deletable by owner" on public.fitness_weekly_plan;
drop policy if exists "Fitness rows are deletable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are deletable by owner"
on public.fitness_weekly_plan for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are readable by owner" on public.finance_transactions;
drop policy if exists "Finance transactions are readable by owner" on public.finance_transactions;
create policy "Finance transactions are readable by owner"
on public.finance_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are insertable by owner" on public.finance_transactions;
drop policy if exists "Finance transactions are insertable by owner" on public.finance_transactions;
create policy "Finance transactions are insertable by owner"
on public.finance_transactions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are updateable by owner" on public.finance_transactions;
drop policy if exists "Finance transactions are updateable by owner" on public.finance_transactions;
create policy "Finance transactions are updateable by owner"
on public.finance_transactions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are deletable by owner" on public.finance_transactions;
drop policy if exists "Finance transactions are deletable by owner" on public.finance_transactions;
create policy "Finance transactions are deletable by owner"
on public.finance_transactions for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ==================================================================
-- 20260716120831_add_history_and_foundation.sql
-- ==================================================================
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

-- Parity guard: this alter can only run while the columns are still text.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'tasks'
       and column_name = 'time_from' and data_type = 'text'
  ) then
    alter table public.tasks
      alter column time_from type time using nullif(time_from, '')::time,
      alter column time_to type time using nullif(time_to, '')::time,
      alter column time_from drop default,
      alter column time_to drop default;
  end if;
end
$$;

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

drop policy if exists "Task completions are readable by owner" on public.task_completions;
create policy "Task completions are readable by owner"
on public.task_completions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Task completions are insertable by owner" on public.task_completions;
create policy "Task completions are insertable by owner"
on public.task_completions for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness plan days are readable by owner" on public.fitness_plan_days;
create policy "Fitness plan days are readable by owner"
on public.fitness_plan_days for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Fitness plan days are insertable by owner" on public.fitness_plan_days;
create policy "Fitness plan days are insertable by owner"
on public.fitness_plan_days for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness plan days are updateable by owner" on public.fitness_plan_days;
create policy "Fitness plan days are updateable by owner"
on public.fitness_plan_days for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness sessions are readable by owner" on public.fitness_sessions;
create policy "Fitness sessions are readable by owner"
on public.fitness_sessions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Fitness sessions are insertable by owner" on public.fitness_sessions;
create policy "Fitness sessions are insertable by owner"
on public.fitness_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness sessions are updateable by owner" on public.fitness_sessions;
create policy "Fitness sessions are updateable by owner"
on public.fitness_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness sessions are deletable by owner" on public.fitness_sessions;
create policy "Fitness sessions are deletable by owner"
on public.fitness_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Weekly reflections are readable by owner" on public.weekly_reflections;
create policy "Weekly reflections are readable by owner"
on public.weekly_reflections for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Weekly reflections are insertable by owner" on public.weekly_reflections;
create policy "Weekly reflections are insertable by owner"
on public.weekly_reflections for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Weekly reflections are updateable by owner" on public.weekly_reflections;
create policy "Weekly reflections are updateable by owner"
on public.weekly_reflections for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


-- ==================================================================
-- 20260716120953_fix_foundation_advisors.sql
-- ==================================================================
alter function public.set_updated_at() set search_path = public;

create index if not exists task_completions_task_idx
  on public.task_completions (task_id);


-- ==================================================================
-- 20260717054131_add_dashboard_preferences.sql
-- ==================================================================
alter table public.profiles
  add column if not exists dashboard_preferences jsonb not null default '{
    "cardOrder": ["rings", "fitness", "finance", "tasks", "analytics", "review"],
    "hiddenCards": [],
    "density": "comfortable",
    "rangeDays": 7,
    "pinnedTaskCategory": "",
    "pinnedFinanceMetric": "balance"
  }'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_dashboard_preferences_object_check,
  add constraint profiles_dashboard_preferences_object_check
    check (jsonb_typeof(dashboard_preferences) = 'object');


-- ==================================================================
-- 20260717081221_add_secure_bank_statement_imports.sql
-- ==================================================================
-- Secure PDF imports store normalized rows only; original bank PDFs are discarded.
create table if not exists public.finance_statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  statement_month date not null,
  fingerprint text not null,
  currency text not null default 'EUR',
  transaction_count integer not null,
  income numeric not null default 0,
  expenses numeric not null default 0,
  net numeric not null default 0,
  created_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint finance_statement_month_first_day_check
    check (statement_month = date_trunc('month', statement_month)::date),
  constraint finance_statement_fingerprint_check
    check (fingerprint ~ '^[a-f0-9]{64}$'),
  constraint finance_statement_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint finance_statement_transaction_count_check
    check (transaction_count between 1 and 500),
  constraint finance_statement_amounts_check
    check (income >= 0 and expenses >= 0 and net = income - expenses),
  unique (user_id, fingerprint),
  unique (id, user_id)
);

alter table public.finance_statement_imports enable row level security;
alter table public.finance_statement_imports force row level security;

revoke all on table public.finance_statement_imports from anon, authenticated;
grant select, insert, update on table public.finance_statement_imports to authenticated;

drop policy if exists "Finance statement imports are readable by owner" on public.finance_statement_imports;
create policy "Finance statement imports are readable by owner"
on public.finance_statement_imports for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Finance statement imports are insertable by owner" on public.finance_statement_imports;
create policy "Finance statement imports are insertable by owner"
on public.finance_statement_imports for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Finance statement imports are updateable by owner" on public.finance_statement_imports;
create policy "Finance statement imports are updateable by owner"
on public.finance_statement_imports for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.finance_transactions
  add column if not exists statement_import_id uuid null;

alter table public.finance_transactions
  drop constraint if exists finance_transactions_statement_import_owner_fkey,
  add constraint finance_transactions_statement_import_owner_fkey
    foreign key (statement_import_id, user_id)
    references public.finance_statement_imports(id, user_id)
    on delete restrict;

alter table public.finance_transactions force row level security;

create index if not exists finance_statement_imports_user_month_idx
  on public.finance_statement_imports (user_id, statement_month desc, created_at desc)
  where archived_at is null;

create index if not exists finance_transactions_statement_import_idx
  on public.finance_transactions (statement_import_id)
  where statement_import_id is not null;

create or replace function public.import_finance_statement(
  p_statement_month date,
  p_fingerprint text,
  p_currency text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_import_id uuid;
  v_transaction_count integer;
  v_income numeric;
  v_expenses numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_statement_month is null
    or p_statement_month <> date_trunc('month', p_statement_month)::date then
    raise exception 'Statement month must be the first day of a month.' using errcode = '22023';
  end if;

  if p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid statement fingerprint.' using errcode = '22023';
  end if;

  if p_currency <> 'EUR' then
    raise exception 'Only EUR statements are supported.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) not between 1 and 500
    or octet_length(p_rows::text) > 1048576 then
    raise exception 'Statement must contain between 1 and 500 valid rows.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) as item(value)
    where jsonb_typeof(value) <> 'object'
      or coalesce(value->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or char_length(btrim(coalesce(value->>'title', ''))) not between 1 and 200
      or char_length(btrim(coalesce(value->>'category', ''))) not between 1 and 80
      or coalesce(jsonb_typeof(value->'amount'), '') <> 'number'
      or (value->>'amount')::numeric = 0
      or abs((value->>'amount')::numeric) > 1000000000
  ) then
    raise exception 'Statement contains an invalid transaction.' using errcode = '22023';
  end if;

  select
    count(*)::integer,
    coalesce(sum(case when (value->>'amount')::numeric > 0 then (value->>'amount')::numeric else 0 end), 0),
    coalesce(sum(case when (value->>'amount')::numeric < 0 then abs((value->>'amount')::numeric) else 0 end), 0)
  into v_transaction_count, v_income, v_expenses
  from jsonb_array_elements(p_rows) as item(value);

  insert into public.finance_statement_imports (
    user_id,
    statement_month,
    fingerprint,
    currency,
    transaction_count,
    income,
    expenses,
    net
  ) values (
    v_user_id,
    p_statement_month,
    p_fingerprint,
    p_currency,
    v_transaction_count,
    v_income,
    v_expenses,
    v_income - v_expenses
  )
  returning id into v_import_id;

  insert into public.finance_transactions (
    user_id,
    date,
    title,
    category,
    amount,
    status,
    statement_import_id
  )
  select
    v_user_id,
    (value->>'date')::date,
    btrim(value->>'title'),
    btrim(value->>'category'),
    (value->>'amount')::numeric,
    'paid',
    v_import_id
  from jsonb_array_elements(p_rows) as item(value);

  return jsonb_build_object(
    'importId', v_import_id,
    'transactionCount', v_transaction_count,
    'income', v_income,
    'expenses', v_expenses,
    'net', v_income - v_expenses
  );
end;
$$;

revoke all on function public.import_finance_statement(date, text, text, jsonb)
  from public, anon;
grant execute on function public.import_finance_statement(date, text, text, jsonb)
  to authenticated;


-- ==================================================================
-- 20260717081716_fix_bank_statement_advisors.sql
-- ==================================================================
-- Cover the composite ownership foreign key used by statement transactions.
drop index if exists public.finance_transactions_statement_import_idx;

create index if not exists finance_transactions_statement_import_owner_idx
  on public.finance_transactions (statement_import_id, user_id)
  where statement_import_id is not null;


-- ==================================================================
-- 20260723055751_fix_priority_one_integrity.sql
-- ==================================================================
-- Priority-one integrity fixes (applied 2026-07-23):
-- - keep task completion ownership aligned with the referenced task
-- - archive/restore all Finance records in one transaction
-- - rate-limit expensive statement parsing per authenticated user

-- Parity guard: the unique constraint carries an FK, so it cannot be dropped
-- and recreated; it is added only where it does not already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'tasks_id_user_id_key'
       and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      drop constraint if exists tasks_id_user_id_key,
      add constraint tasks_id_user_id_key unique (id, user_id);
  end if;
end
$$;

alter table public.task_completions
  drop constraint if exists task_completions_task_id_fkey,
  drop constraint if exists task_completions_task_owner_fkey,
  add constraint task_completions_task_owner_fkey
    foreign key (task_id, user_id)
    references public.tasks(id, user_id)
    on delete cascade;

create or replace function public.archive_finance_data()
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_archived_at timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  update public.finance_transactions
  set archived_at = v_archived_at
  where user_id = v_user_id
    and archived_at is null;

  update public.finance_statement_imports
  set archived_at = v_archived_at
  where user_id = v_user_id
    and archived_at is null;

  return v_archived_at;
end;
$$;

create or replace function public.restore_finance_data(p_archived_at timestamptz)
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

  if p_archived_at is null then
    raise exception 'Archive timestamp is required.' using errcode = '22023';
  end if;

  update public.finance_transactions
  set archived_at = null
  where user_id = v_user_id
    and archived_at = p_archived_at;

  update public.finance_statement_imports
  set archived_at = null
  where user_id = v_user_id
    and archived_at = p_archived_at;

  return true;
end;
$$;

revoke all on function public.archive_finance_data() from public, anon;
revoke all on function public.restore_finance_data(timestamptz) from public, anon;
grant execute on function public.archive_finance_data() to authenticated;
grant execute on function public.restore_finance_data(timestamptz) to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists private.finance_statement_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  constraint finance_statement_rate_limit_count_check
    check (request_count between 0 and 1000000)
);

alter table private.finance_statement_rate_limits enable row level security;
alter table private.finance_statement_rate_limits force row level security;

revoke all on table private.finance_statement_rate_limits from public, anon, authenticated;
grant select, insert, update on table private.finance_statement_rate_limits to authenticated;

drop policy if exists "Statement rate limits are readable by owner" on private.finance_statement_rate_limits;
create policy "Statement rate limits are readable by owner"
on private.finance_statement_rate_limits for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Statement rate limits are insertable by owner" on private.finance_statement_rate_limits;
create policy "Statement rate limits are insertable by owner"
on private.finance_statement_rate_limits for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Statement rate limits are updateable by owner" on private.finance_statement_rate_limits;
create policy "Statement rate limits are updateable by owner"
on private.finance_statement_rate_limits for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.consume_finance_statement_rate_limit()
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_request_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  insert into private.finance_statement_rate_limits (
    user_id,
    window_started_at,
    request_count
  )
  values (v_user_id, now(), 1)
  on conflict (user_id) do update
  set
    request_count = case
      when private.finance_statement_rate_limits.window_started_at <= now() - interval '10 minutes'
        then 1
      else private.finance_statement_rate_limits.request_count + 1
    end,
    window_started_at = case
      when private.finance_statement_rate_limits.window_started_at <= now() - interval '10 minutes'
        then now()
      else private.finance_statement_rate_limits.window_started_at
    end
  returning request_count into v_request_count;

  return v_request_count <= 10;
end;
$$;

revoke all on function public.consume_finance_statement_rate_limit()
  from public, anon;
grant execute on function public.consume_finance_statement_rate_limit()
  to authenticated;


-- ==================================================================
-- 20260723055912_fix_priority_one_advisors.sql
-- ==================================================================
-- Cover the composite ownership foreign key and replace its redundant prefix index (applied 2026-07-23).
drop index if exists public.task_completions_task_idx;

create index if not exists task_completions_task_owner_idx
  on public.task_completions (task_id, user_id);


-- ==================================================================
-- 20260724054232_add_versioned_fitness_plans.sql
-- ==================================================================
-- Preserve the plan that applied to each historical calendar date.
-- Current reusable weekday rows remain in fitness_plan_days; every change also
-- records an effective-dated version for productivity history.

create table if not exists public.fitness_plan_versions (
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

create index if not exists fitness_plan_versions_user_effective_idx
  on public.fitness_plan_versions (user_id, weekday, effective_from desc);

alter table public.fitness_plan_versions enable row level security;

grant select, insert, update on public.fitness_plan_versions to authenticated;

drop policy if exists "Fitness plan versions are readable by owner" on public.fitness_plan_versions;
create policy "Fitness plan versions are readable by owner"
on public.fitness_plan_versions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Fitness plan versions are insertable by owner" on public.fitness_plan_versions;
create policy "Fitness plan versions are insertable by owner"
on public.fitness_plan_versions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness plan versions are updateable by owner" on public.fitness_plan_versions;
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


-- ==================================================================
-- 20260724055049_harden_fitness_plan_version_grants.sql
-- ==================================================================
revoke all on table public.fitness_plan_versions from public, anon;
grant select, insert, update on table public.fitness_plan_versions
  to authenticated;


-- ==================================================================
-- 20260724060953_lock_fitness_plan_writes_to_rpcs.sql
-- ==================================================================
-- Plan changes must update the reusable row and effective-dated snapshot in one
-- transaction. Authenticated clients can read both tables but write only
-- through the narrowly-scoped RPCs, which derive ownership from auth.uid().

alter function public.set_fitness_plan_day(text, text, date) security definer;
alter function public.replace_fitness_plan(date, jsonb) security definer;

revoke insert, update, delete on table public.fitness_plan_days
  from authenticated;
revoke insert, update, delete on table public.fitness_plan_versions
  from authenticated;

grant select on table public.fitness_plan_days to authenticated;
grant select on table public.fitness_plan_versions to authenticated;


-- ==================================================================
-- 20260724061122_enforce_fitness_plan_snapshots_with_trigger.sql
-- ==================================================================
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


-- ==================================================================
-- 20260724064413_add_fitness_setup_profiles.sql
-- ==================================================================
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
drop policy if exists "fitness_profiles_select_own" on public.fitness_profiles;
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


-- ==================================================================
-- 20260724065104_harden_fitness_setup_function.sql
-- ==================================================================
-- The trigger enforces effective-dated plan snapshots for every write, so the
-- setup RPC can run as the signed-in owner under the same RLS boundary as the
-- rest of Fitness instead of elevating privileges.

drop policy if exists "fitness_profiles_insert_own"
  on public.fitness_profiles;
drop policy if exists "fitness_profiles_insert_own" on public.fitness_profiles;
create policy "fitness_profiles_insert_own"
on public.fitness_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fitness_profiles_update_own"
  on public.fitness_profiles;
drop policy if exists "fitness_profiles_update_own" on public.fitness_profiles;
create policy "fitness_profiles_update_own"
on public.fitness_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant insert, update on table public.fitness_profiles to authenticated;

alter function public.configure_fitness_plan(date, jsonb, jsonb)
  security invoker;


-- ==================================================================
-- 20260825090000_add_push_reminders.sql
-- ==================================================================
-- Evening reminders.
--
-- A subscription belongs to a device, not to an account: the same person on a
-- phone and a laptop is two rows. Writes go through security-definer functions
-- so a client can only ever touch its own rows, matching how fitness plans and
-- finance imports are already locked down.
--
-- Backwards compatible: both tables are new, nothing existing is read or
-- rewritten, and dropping them restores the previous behaviour exactly.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null check (char_length(p256dh) between 1 and 255),
  auth text not null check (char_length(auth) between 1 and 255),
  user_agent text not null default '' check (char_length(user_agent) <= 300),
  failure_count integer not null default 0 check (failure_count >= 0),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own"
  on public.push_subscriptions;
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.push_subscriptions from public, anon;
revoke insert, update, delete on table public.push_subscriptions
  from authenticated;
grant select on table public.push_subscriptions to authenticated;

-- One row per person per day. The primary key is the dedupe: the sender
-- inserts before it sends, and a conflict means today is already handled.
create table if not exists public.push_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, sent_on)
);

alter table public.push_deliveries enable row level security;

revoke all on table public.push_deliveries from public, anon, authenticated;

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(coalesce(p_endpoint, '')) not between 1 and 1000 then
    raise exception 'Invalid subscription endpoint';
  end if;

  insert into public.push_subscriptions (
    auth, endpoint, p256dh, user_agent, user_id
  )
  values (
    p_auth, p_endpoint, p_p256dh, left(coalesce(p_user_agent, ''), 300),
    v_user_id
  )
  on conflict (endpoint) do update
  set auth = excluded.auth,
      failure_count = 0,
      last_seen_at = now(),
      p256dh = excluded.p256dh,
      user_agent = excluded.user_agent,
      user_id = excluded.user_id;
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.push_subscriptions
  where endpoint = p_endpoint
    and user_id = v_user_id;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text)
  from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text)
  to authenticated;

revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text)
  to authenticated;


-- ==================================================================
-- 20260825140000_add_crew.sql
-- ==================================================================
-- The crew: a small, private circle you actually know.
--
-- Orbit stays single-player by default. Nothing here is public, there is no
-- search, and no directory: the only way in is a code someone hands you, and
-- the only thing a friend can ever read is a published daily summary — a
-- score, an altitude, a tier, a run length and how many rings closed. Task
-- titles, sessions, transactions and preferences never leave the account.
--
-- Backwards compatible: four new tables, nothing existing is read or rewritten,
-- and dropping them restores the previous behaviour exactly.

-- ---------------------------------------------------------------- identity --

-- The name and code a friend sees. Deliberately separate from public.profiles,
-- which carries private preferences and must stay owner-only.
create table if not exists public.orbit_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 40),
  friend_code text not null unique
    check (friend_code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orbit_profiles enable row level security;

-- ------------------------------------------------------------- friendships --

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- One link per pair, whichever direction it was asked in.
create unique index if not exists friendships_pair_idx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
on public.friendships
for select
to authenticated
using (
  (select auth.uid()) in (requester_id, addressee_id)
);

revoke all on table public.friendships from public, anon;
revoke insert, update, delete on table public.friendships from authenticated;
grant select on table public.friendships to authenticated;

-- Answers "may these two see each other" without exposing the friendship rows
-- to the policies that ask. Security definer so a policy on another table can
-- call it, stable so the planner may cache it inside a statement.
create or replace function public.is_crew(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = p_a and addressee_id = p_b)
        or (requester_id = p_b and addressee_id = p_a)
      )
  );
$$;

-- The same question for a link in any state: a pending request must be able to
-- show the name of whoever sent it.
create or replace function public.has_crew_link(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.friendships
    where (requester_id = p_a and addressee_id = p_b)
       or (requester_id = p_b and addressee_id = p_a)
  );
$$;

revoke all on function public.is_crew(uuid, uuid) from public, anon;
grant execute on function public.is_crew(uuid, uuid) to authenticated;
revoke all on function public.has_crew_link(uuid, uuid) from public, anon;
grant execute on function public.has_crew_link(uuid, uuid) to authenticated;

drop policy if exists "orbit_profiles_select_crew" on public.orbit_profiles;
drop policy if exists "orbit_profiles_select_crew" on public.orbit_profiles;
create policy "orbit_profiles_select_crew"
on public.orbit_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.has_crew_link((select auth.uid()), user_id)
);

revoke all on table public.orbit_profiles from public, anon;
revoke insert, update, delete on table public.orbit_profiles from authenticated;
grant select on table public.orbit_profiles to authenticated;

-- --------------------------------------------------------------- snapshots --

-- One published day per account. This is the only shape of personal data that
-- ever crosses between two accounts, and it is deliberately all numbers.
create table if not exists public.orbit_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  score integer not null check (score between 0 and 100),
  altitude integer not null check (altitude between 0 and 100),
  tier_id text not null check (char_length(tier_id) between 1 and 40),
  streak integer not null default 0 check (streak >= 0),
  rings_closed integer not null default 0 check (rings_closed between 0 and 9),
  rings_total integer not null default 0 check (rings_total between 0 and 9),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists orbit_snapshots_day_idx
  on public.orbit_snapshots (day desc);

alter table public.orbit_snapshots enable row level security;

drop policy if exists "orbit_snapshots_select_crew" on public.orbit_snapshots;
drop policy if exists "orbit_snapshots_select_crew" on public.orbit_snapshots;
create policy "orbit_snapshots_select_crew"
on public.orbit_snapshots
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.is_crew((select auth.uid()), user_id)
);

revoke all on table public.orbit_snapshots from public, anon;
revoke insert, update, delete on table public.orbit_snapshots from authenticated;
grant select on table public.orbit_snapshots to authenticated;

-- --------------------------------------------------------------- reactions --

create table if not exists public.orbit_reactions (
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('fire', 'clap', 'eyes')),
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, day, kind),
  check (from_user <> to_user)
);

create index if not exists orbit_reactions_target_idx
  on public.orbit_reactions (to_user, day);

alter table public.orbit_reactions enable row level security;

drop policy if exists "orbit_reactions_select_crew" on public.orbit_reactions;
drop policy if exists "orbit_reactions_select_crew" on public.orbit_reactions;
create policy "orbit_reactions_select_crew"
on public.orbit_reactions
for select
to authenticated
using (
  (select auth.uid()) in (from_user, to_user)
  or public.is_crew((select auth.uid()), to_user)
);

revoke all on table public.orbit_reactions from public, anon;
revoke insert, update, delete on table public.orbit_reactions from authenticated;
grant select on table public.orbit_reactions to authenticated;

-- --------------------------------------------------------------- functions --

-- Creates the caller's crew identity, or refreshes the name on it. The code is
-- generated here so a client can never choose or guess one.
create or replace function public.ensure_orbit_profile(p_display_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := left(nullif(btrim(coalesce(p_display_name, '')), ''), 40);
  v_code text;
  v_existing text;
  v_attempt integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select friend_code into v_existing
  from public.orbit_profiles
  where user_id = v_user_id;

  if v_existing is not null then
    if v_name is not null then
      update public.orbit_profiles
      set display_name = v_name,
          updated_at = now()
      where user_id = v_user_id
        and display_name is distinct from v_name;
    end if;
    return v_existing;
  end if;

  loop
    v_attempt := v_attempt + 1;
    -- Eight characters from a 32-symbol alphabet: enough that guessing one is
    -- not a way in, short enough to read out loud.
    v_code := (
      select string_agg(
        substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
               1 + floor(random() * 32)::integer, 1),
        ''
      )
      from generate_series(1, 8)
    );

    begin
      insert into public.orbit_profiles (display_name, friend_code, user_id)
      values (coalesce(v_name, 'Orbit user'), v_code, v_user_id);
      return v_code;
    exception
      when unique_violation then
        if v_attempt >= 8 then
          raise exception 'Could not allocate a crew code';
        end if;
    end;
  end loop;
end;
$$;

-- Adds someone by the code they gave you. Returns what actually happened, so
-- the interface can say it rather than guess.
create or replace function public.request_friendship(p_code text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_target uuid;
  v_link public.friendships;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select user_id into v_target
  from public.orbit_profiles
  where friend_code = upper(btrim(coalesce(p_code, '')));

  if v_target is null then
    return 'unknown';
  end if;

  if v_target = v_user_id then
    return 'self';
  end if;

  select * into v_link
  from public.friendships
  where (requester_id = v_user_id and addressee_id = v_target)
     or (requester_id = v_target and addressee_id = v_user_id);

  if v_link.id is not null then
    if v_link.status = 'accepted' then
      return 'already';
    end if;

    -- They asked first: entering their code is the answer.
    if v_link.addressee_id = v_user_id then
      update public.friendships
      set status = 'accepted',
          responded_at = now()
      where id = v_link.id;
      return 'accepted';
    end if;

    return 'pending';
  end if;

  insert into public.friendships (addressee_id, requester_id)
  values (v_target, v_user_id);

  return 'requested';
end;
$$;

create or replace function public.respond_to_friendship(
  p_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_accept then
    update public.friendships
    set status = 'accepted',
        responded_at = now()
    where id = p_id
      and addressee_id = v_user_id
      and status = 'pending';
  else
    delete from public.friendships
    where id = p_id
      and addressee_id = v_user_id
      and status = 'pending';
  end if;
end;
$$;

-- Either side can leave, at any time, without asking the other.
create or replace function public.remove_friendship(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.friendships
  where id = p_id
    and v_user_id in (requester_id, addressee_id);
end;
$$;

-- Publishes the caller's own day. Only ever the caller's: the row is keyed on
-- auth.uid(), never on anything the client sends.
create or replace function public.publish_orbit_snapshot(
  p_day date,
  p_score integer,
  p_altitude integer,
  p_tier_id text,
  p_streak integer,
  p_rings_closed integer,
  p_rings_total integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_day is null or p_day > (current_date + 1) then
    raise exception 'Invalid snapshot day';
  end if;

  insert into public.orbit_snapshots (
    altitude, day, rings_closed, rings_total, score, streak, tier_id, user_id
  )
  values (
    greatest(0, least(100, coalesce(p_altitude, 0))),
    p_day,
    greatest(0, least(9, coalesce(p_rings_closed, 0))),
    greatest(0, least(9, coalesce(p_rings_total, 0))),
    greatest(0, least(100, coalesce(p_score, 0))),
    greatest(0, coalesce(p_streak, 0)),
    left(coalesce(p_tier_id, 'grounded'), 40),
    v_user_id
  )
  on conflict (user_id, day) do update
  set altitude = excluded.altitude,
      rings_closed = excluded.rings_closed,
      rings_total = excluded.rings_total,
      score = excluded.score,
      streak = excluded.streak,
      tier_id = excluded.tier_id,
      updated_at = now();
end;
$$;

-- One reaction of each kind per friend per day; sending it again takes it back.
create or replace function public.react_to_day(
  p_to_user uuid,
  p_day date,
  p_kind text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_crew(v_user_id, p_to_user) then
    raise exception 'Not in your crew';
  end if;

  if p_kind not in ('fire', 'clap', 'eyes') then
    raise exception 'Unknown reaction';
  end if;

  delete from public.orbit_reactions
  where from_user = v_user_id
    and to_user = p_to_user
    and day = p_day
    and kind = p_kind;

  get diagnostics v_deleted = row_count;
  if v_deleted > 0 then
    return false;
  end if;

  insert into public.orbit_reactions (day, from_user, kind, to_user)
  values (p_day, v_user_id, p_kind, p_to_user);

  return true;
end;
$$;

revoke all on function public.ensure_orbit_profile(text) from public, anon;
grant execute on function public.ensure_orbit_profile(text) to authenticated;

revoke all on function public.request_friendship(text) from public, anon;
grant execute on function public.request_friendship(text) to authenticated;

revoke all on function public.respond_to_friendship(uuid, boolean)
  from public, anon;
grant execute on function public.respond_to_friendship(uuid, boolean)
  to authenticated;

revoke all on function public.remove_friendship(uuid) from public, anon;
grant execute on function public.remove_friendship(uuid) to authenticated;

revoke all on function public.publish_orbit_snapshot(
  date, integer, integer, text, integer, integer, integer
) from public, anon;
grant execute on function public.publish_orbit_snapshot(
  date, integer, integer, text, integer, integer, integer
) to authenticated;

revoke all on function public.react_to_day(uuid, date, text) from public, anon;
grant execute on function public.react_to_day(uuid, date, text) to authenticated;


-- ==================================================================
-- 20260826090000_add_task_routines.sql
-- ==================================================================
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

-- PostgREST matches writes against a cached schema, so until it reloads, an
-- insert naming the new column is refused with PGRST204 even though the column
-- exists. Reads go straight to Postgres and would already work, which is a
-- confusing half-broken state to leave behind.
notify pgrst, 'reload schema';


-- ==================================================================
-- 20260828090000_add_habits.sql
-- ==================================================================
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


-- ==================================================================
-- 20260829090000_add_ingest_tokens.sql
-- ==================================================================
-- Letting a watch write into Orbit.
--
-- Xiaomi has no public API, so nothing can read Mi Fitness directly. What it
-- does have is Apple Health, which it writes to, and iOS can run a Shortcut
-- when a workout ends. So the phone pushes, rather than Orbit pulling: one
-- endpoint, one secret, and a session appears the moment the watch stops.
--
-- The secret is a bearer token and is therefore treated like a password. Only
-- its SHA-256 lands in the table — a copy of this database is not a copy of
-- everyone's watch access — and the token itself is shown once, at the moment
-- it is made, and never again. Losing it means making a new one, which is the
-- correct trade for a credential that lives in a phone automation.
--
-- Backwards compatible: one new table, nothing existing read or rewritten,
-- and dropping it restores the previous behaviour exactly.

create table if not exists public.ingest_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.ingest_tokens enable row level security;

-- The owner may see that a token exists and when it was last used. The token
-- itself is not here to be seen — only its hash is stored at all.
drop policy if exists "ingest_tokens_select_own" on public.ingest_tokens;
drop policy if exists "ingest_tokens_select_own" on public.ingest_tokens;
create policy "ingest_tokens_select_own"
on public.ingest_tokens
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.ingest_tokens from public, anon;
revoke insert, update, delete on table public.ingest_tokens from authenticated;
grant select on table public.ingest_tokens to authenticated;

-- sha256 and convert_to are both in pg_catalog, which stays in scope even with
-- the search path pinned empty, so this needs no extension and no exception.
create or replace function public.hash_ingest_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

revoke all on function public.hash_ingest_token(text) from public, anon;
grant execute on function public.hash_ingest_token(text) to authenticated;

-- Issuing a token replaces whatever was there: one watch, one secret, and
-- making a new one is how you revoke the old.
create or replace function public.set_ingest_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_hash text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- Long enough that guessing is not a strategy. The client generates it from
  -- a cryptographic source; this only refuses anything obviously too short.
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'That token is too short to be a secret.'
      using errcode = '22023';
  end if;

  v_hash := public.hash_ingest_token(p_token);

  insert into public.ingest_tokens (user_id, token_hash)
  values (v_user_id, v_hash)
  on conflict (user_id) do update
    set token_hash = excluded.token_hash,
        created_at = now(),
        last_used_at = null;
end;
$$;

revoke all on function public.set_ingest_token(text) from public, anon;
grant execute on function public.set_ingest_token(text) to authenticated;

create or replace function public.clear_ingest_token()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  delete from public.ingest_tokens where user_id = v_user_id;
end;
$$;

revoke all on function public.clear_ingest_token() from public, anon;
grant execute on function public.clear_ingest_token() to authenticated;

-- PostgREST matches requests against a cached schema, so until it reloads,
-- every call here is refused as unknown even though it exists.
notify pgrst, 'reload schema';
