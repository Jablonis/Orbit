-- Priority-one integrity fixes (applied 2026-07-23):
-- - keep task completion ownership aligned with the referenced task
-- - archive/restore all Finance records in one transaction
-- - rate-limit expensive statement parsing per authenticated user

alter table public.tasks
  add constraint tasks_id_user_id_key unique (id, user_id);

alter table public.task_completions
  drop constraint if exists task_completions_task_id_fkey,
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

create table private.finance_statement_rate_limits (
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

create policy "Statement rate limits are readable by owner"
on private.finance_statement_rate_limits for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Statement rate limits are insertable by owner"
on private.finance_statement_rate_limits for insert
to authenticated
with check ((select auth.uid()) = user_id);

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
