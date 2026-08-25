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
