-- Cover the composite ownership foreign key and replace its redundant prefix index (applied 2026-07-23).
drop index if exists public.task_completions_task_idx;

create index task_completions_task_owner_idx
  on public.task_completions (task_id, user_id);
