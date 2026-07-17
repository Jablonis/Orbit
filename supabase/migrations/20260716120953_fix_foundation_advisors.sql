alter function public.set_updated_at() set search_path = public;

create index if not exists task_completions_task_idx
  on public.task_completions (task_id);
