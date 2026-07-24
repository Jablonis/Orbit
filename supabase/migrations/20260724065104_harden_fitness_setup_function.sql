-- The trigger enforces effective-dated plan snapshots for every write, so the
-- setup RPC can run as the signed-in owner under the same RLS boundary as the
-- rest of Fitness instead of elevating privileges.

drop policy if exists "fitness_profiles_insert_own"
  on public.fitness_profiles;
create policy "fitness_profiles_insert_own"
on public.fitness_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fitness_profiles_update_own"
  on public.fitness_profiles;
create policy "fitness_profiles_update_own"
on public.fitness_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant insert, update on table public.fitness_profiles to authenticated;

alter function public.configure_fitness_plan(date, jsonb, jsonb)
  security invoker;
