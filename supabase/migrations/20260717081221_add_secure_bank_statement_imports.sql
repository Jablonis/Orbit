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

create policy "Finance statement imports are readable by owner"
on public.finance_statement_imports for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Finance statement imports are insertable by owner"
on public.finance_statement_imports for insert
to authenticated
with check ((select auth.uid()) = user_id);

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
