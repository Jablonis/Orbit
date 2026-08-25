-- The crew: a small, private circle you actually know.
--
-- Orbit stays single-player by default. Nothing here is public, there is no
-- search, and no directory: the only way in is a code someone hands you, and
-- the only thing a friend can ever read is a published daily summary — a
-- score, an altitude, a tier, a run length and how many rings closed. Task
-- titles, sessions, transactions and preferences never leave the account.
--
-- Backwards compatible: four new tables, nothing existing is read or rewritten,
-- and dropping them restores the previous behaviour exactly.

-- ---------------------------------------------------------------- identity --

-- The name and code a friend sees. Deliberately separate from public.profiles,
-- which carries private preferences and must stay owner-only.
create table if not exists public.orbit_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 40),
  friend_code text not null unique
    check (friend_code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orbit_profiles enable row level security;

-- ------------------------------------------------------------- friendships --

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- One link per pair, whichever direction it was asked in.
create unique index if not exists friendships_pair_idx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_addressee_idx
  on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
on public.friendships
for select
to authenticated
using (
  (select auth.uid()) in (requester_id, addressee_id)
);

revoke all on table public.friendships from public, anon;
revoke insert, update, delete on table public.friendships from authenticated;
grant select on table public.friendships to authenticated;

-- Answers "may these two see each other" without exposing the friendship rows
-- to the policies that ask. Security definer so a policy on another table can
-- call it, stable so the planner may cache it inside a statement.
create or replace function public.is_crew(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = p_a and addressee_id = p_b)
        or (requester_id = p_b and addressee_id = p_a)
      )
  );
$$;

-- The same question for a link in any state: a pending request must be able to
-- show the name of whoever sent it.
create or replace function public.has_crew_link(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.friendships
    where (requester_id = p_a and addressee_id = p_b)
       or (requester_id = p_b and addressee_id = p_a)
  );
$$;

revoke all on function public.is_crew(uuid, uuid) from public, anon;
grant execute on function public.is_crew(uuid, uuid) to authenticated;
revoke all on function public.has_crew_link(uuid, uuid) from public, anon;
grant execute on function public.has_crew_link(uuid, uuid) to authenticated;

drop policy if exists "orbit_profiles_select_crew" on public.orbit_profiles;
create policy "orbit_profiles_select_crew"
on public.orbit_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.has_crew_link((select auth.uid()), user_id)
);

revoke all on table public.orbit_profiles from public, anon;
revoke insert, update, delete on table public.orbit_profiles from authenticated;
grant select on table public.orbit_profiles to authenticated;

-- --------------------------------------------------------------- snapshots --

-- One published day per account. This is the only shape of personal data that
-- ever crosses between two accounts, and it is deliberately all numbers.
create table if not exists public.orbit_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  score integer not null check (score between 0 and 100),
  altitude integer not null check (altitude between 0 and 100),
  tier_id text not null check (char_length(tier_id) between 1 and 40),
  streak integer not null default 0 check (streak >= 0),
  rings_closed integer not null default 0 check (rings_closed between 0 and 9),
  rings_total integer not null default 0 check (rings_total between 0 and 9),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists orbit_snapshots_day_idx
  on public.orbit_snapshots (day desc);

alter table public.orbit_snapshots enable row level security;

drop policy if exists "orbit_snapshots_select_crew" on public.orbit_snapshots;
create policy "orbit_snapshots_select_crew"
on public.orbit_snapshots
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.is_crew((select auth.uid()), user_id)
);

revoke all on table public.orbit_snapshots from public, anon;
revoke insert, update, delete on table public.orbit_snapshots from authenticated;
grant select on table public.orbit_snapshots to authenticated;

-- --------------------------------------------------------------- reactions --

create table if not exists public.orbit_reactions (
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('fire', 'clap', 'eyes')),
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, day, kind),
  check (from_user <> to_user)
);

create index if not exists orbit_reactions_target_idx
  on public.orbit_reactions (to_user, day);

alter table public.orbit_reactions enable row level security;

drop policy if exists "orbit_reactions_select_crew" on public.orbit_reactions;
create policy "orbit_reactions_select_crew"
on public.orbit_reactions
for select
to authenticated
using (
  (select auth.uid()) in (from_user, to_user)
  or public.is_crew((select auth.uid()), to_user)
);

revoke all on table public.orbit_reactions from public, anon;
revoke insert, update, delete on table public.orbit_reactions from authenticated;
grant select on table public.orbit_reactions to authenticated;

-- --------------------------------------------------------------- functions --

-- Creates the caller's crew identity, or refreshes the name on it. The code is
-- generated here so a client can never choose or guess one.
create or replace function public.ensure_orbit_profile(p_display_name text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := left(nullif(btrim(coalesce(p_display_name, '')), ''), 40);
  v_code text;
  v_existing text;
  v_attempt integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select friend_code into v_existing
  from public.orbit_profiles
  where user_id = v_user_id;

  if v_existing is not null then
    if v_name is not null then
      update public.orbit_profiles
      set display_name = v_name,
          updated_at = now()
      where user_id = v_user_id
        and display_name is distinct from v_name;
    end if;
    return v_existing;
  end if;

  loop
    v_attempt := v_attempt + 1;
    -- Eight characters from a 32-symbol alphabet: enough that guessing one is
    -- not a way in, short enough to read out loud.
    v_code := (
      select string_agg(
        substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
               1 + floor(random() * 32)::integer, 1),
        ''
      )
      from generate_series(1, 8)
    );

    begin
      insert into public.orbit_profiles (display_name, friend_code, user_id)
      values (coalesce(v_name, 'Orbit user'), v_code, v_user_id);
      return v_code;
    exception
      when unique_violation then
        if v_attempt >= 8 then
          raise exception 'Could not allocate a crew code';
        end if;
    end;
  end loop;
end;
$$;

-- Adds someone by the code they gave you. Returns what actually happened, so
-- the interface can say it rather than guess.
create or replace function public.request_friendship(p_code text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_target uuid;
  v_link public.friendships;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select user_id into v_target
  from public.orbit_profiles
  where friend_code = upper(btrim(coalesce(p_code, '')));

  if v_target is null then
    return 'unknown';
  end if;

  if v_target = v_user_id then
    return 'self';
  end if;

  select * into v_link
  from public.friendships
  where (requester_id = v_user_id and addressee_id = v_target)
     or (requester_id = v_target and addressee_id = v_user_id);

  if v_link.id is not null then
    if v_link.status = 'accepted' then
      return 'already';
    end if;

    -- They asked first: entering their code is the answer.
    if v_link.addressee_id = v_user_id then
      update public.friendships
      set status = 'accepted',
          responded_at = now()
      where id = v_link.id;
      return 'accepted';
    end if;

    return 'pending';
  end if;

  insert into public.friendships (addressee_id, requester_id)
  values (v_target, v_user_id);

  return 'requested';
end;
$$;

create or replace function public.respond_to_friendship(
  p_id uuid,
  p_accept boolean
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

  if p_accept then
    update public.friendships
    set status = 'accepted',
        responded_at = now()
    where id = p_id
      and addressee_id = v_user_id
      and status = 'pending';
  else
    delete from public.friendships
    where id = p_id
      and addressee_id = v_user_id
      and status = 'pending';
  end if;
end;
$$;

-- Either side can leave, at any time, without asking the other.
create or replace function public.remove_friendship(p_id uuid)
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

  delete from public.friendships
  where id = p_id
    and v_user_id in (requester_id, addressee_id);
end;
$$;

-- Publishes the caller's own day. Only ever the caller's: the row is keyed on
-- auth.uid(), never on anything the client sends.
create or replace function public.publish_orbit_snapshot(
  p_day date,
  p_score integer,
  p_altitude integer,
  p_tier_id text,
  p_streak integer,
  p_rings_closed integer,
  p_rings_total integer
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

  if p_day is null or p_day > (current_date + 1) then
    raise exception 'Invalid snapshot day';
  end if;

  insert into public.orbit_snapshots (
    altitude, day, rings_closed, rings_total, score, streak, tier_id, user_id
  )
  values (
    greatest(0, least(100, coalesce(p_altitude, 0))),
    p_day,
    greatest(0, least(9, coalesce(p_rings_closed, 0))),
    greatest(0, least(9, coalesce(p_rings_total, 0))),
    greatest(0, least(100, coalesce(p_score, 0))),
    greatest(0, coalesce(p_streak, 0)),
    left(coalesce(p_tier_id, 'grounded'), 40),
    v_user_id
  )
  on conflict (user_id, day) do update
  set altitude = excluded.altitude,
      rings_closed = excluded.rings_closed,
      rings_total = excluded.rings_total,
      score = excluded.score,
      streak = excluded.streak,
      tier_id = excluded.tier_id,
      updated_at = now();
end;
$$;

-- One reaction of each kind per friend per day; sending it again takes it back.
create or replace function public.react_to_day(
  p_to_user uuid,
  p_day date,
  p_kind text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_crew(v_user_id, p_to_user) then
    raise exception 'Not in your crew';
  end if;

  if p_kind not in ('fire', 'clap', 'eyes') then
    raise exception 'Unknown reaction';
  end if;

  delete from public.orbit_reactions
  where from_user = v_user_id
    and to_user = p_to_user
    and day = p_day
    and kind = p_kind;

  get diagnostics v_deleted = row_count;
  if v_deleted > 0 then
    return false;
  end if;

  insert into public.orbit_reactions (day, from_user, kind, to_user)
  values (p_day, v_user_id, p_kind, p_to_user);

  return true;
end;
$$;

revoke all on function public.ensure_orbit_profile(text) from public, anon;
grant execute on function public.ensure_orbit_profile(text) to authenticated;

revoke all on function public.request_friendship(text) from public, anon;
grant execute on function public.request_friendship(text) to authenticated;

revoke all on function public.respond_to_friendship(uuid, boolean)
  from public, anon;
grant execute on function public.respond_to_friendship(uuid, boolean)
  to authenticated;

revoke all on function public.remove_friendship(uuid) from public, anon;
grant execute on function public.remove_friendship(uuid) to authenticated;

revoke all on function public.publish_orbit_snapshot(
  date, integer, integer, text, integer, integer, integer
) from public, anon;
grant execute on function public.publish_orbit_snapshot(
  date, integer, integer, text, integer, integer, integer
) to authenticated;

revoke all on function public.react_to_day(uuid, date, text) from public, anon;
grant execute on function public.react_to_day(uuid, date, text) to authenticated;
