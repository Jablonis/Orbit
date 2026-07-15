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
create policy "Profiles are readable by owner"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Profiles are updateable by owner" on public.profiles;
create policy "Profiles are updateable by owner"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Profiles are deletable by owner" on public.profiles;
create policy "Profiles are deletable by owner"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Tasks are readable by owner" on public.tasks;
create policy "Tasks are readable by owner"
on public.tasks for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Tasks are insertable by owner" on public.tasks;
create policy "Tasks are insertable by owner"
on public.tasks for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Tasks are updateable by owner" on public.tasks;
create policy "Tasks are updateable by owner"
on public.tasks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Tasks are deletable by owner" on public.tasks;
create policy "Tasks are deletable by owner"
on public.tasks for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are readable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are readable by owner"
on public.fitness_weekly_plan for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are insertable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are insertable by owner"
on public.fitness_weekly_plan for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are updateable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are updateable by owner"
on public.fitness_weekly_plan for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Fitness rows are deletable by owner" on public.fitness_weekly_plan;
create policy "Fitness rows are deletable by owner"
on public.fitness_weekly_plan for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are readable by owner" on public.finance_transactions;
create policy "Finance transactions are readable by owner"
on public.finance_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are insertable by owner" on public.finance_transactions;
create policy "Finance transactions are insertable by owner"
on public.finance_transactions for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are updateable by owner" on public.finance_transactions;
create policy "Finance transactions are updateable by owner"
on public.finance_transactions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Finance transactions are deletable by owner" on public.finance_transactions;
create policy "Finance transactions are deletable by owner"
on public.finance_transactions for delete
to authenticated
using ((select auth.uid()) = user_id);
