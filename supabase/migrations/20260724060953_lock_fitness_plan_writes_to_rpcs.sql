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
