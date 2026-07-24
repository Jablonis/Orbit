revoke all on table public.fitness_plan_versions from public, anon;
grant select, insert, update on table public.fitness_plan_versions
  to authenticated;
