-- Cover the composite ownership foreign key used by statement transactions.
drop index if exists public.finance_transactions_statement_import_idx;

create index if not exists finance_transactions_statement_import_owner_idx
  on public.finance_transactions (statement_import_id, user_id)
  where statement_import_id is not null;
