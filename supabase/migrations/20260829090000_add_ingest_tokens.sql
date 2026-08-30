-- Letting a watch write into Orbit.
--
-- Xiaomi has no public API, so nothing can read Mi Fitness directly. What it
-- does have is Apple Health, which it writes to, and iOS can run a Shortcut
-- when a workout ends. So the phone pushes, rather than Orbit pulling: one
-- endpoint, one secret, and a session appears the moment the watch stops.
--
-- The secret is a bearer token and is therefore treated like a password. Only
-- its SHA-256 lands in the table — a copy of this database is not a copy of
-- everyone's watch access — and the token itself is shown once, at the moment
-- it is made, and never again. Losing it means making a new one, which is the
-- correct trade for a credential that lives in a phone automation.
--
-- Backwards compatible: one new table, nothing existing read or rewritten,
-- and dropping it restores the previous behaviour exactly.

create table if not exists public.ingest_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.ingest_tokens enable row level security;

-- The owner may see that a token exists and when it was last used. The token
-- itself is not here to be seen — only its hash is stored at all.
drop policy if exists "ingest_tokens_select_own" on public.ingest_tokens;
create policy "ingest_tokens_select_own"
on public.ingest_tokens
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.ingest_tokens from public, anon;
revoke insert, update, delete on table public.ingest_tokens from authenticated;
grant select on table public.ingest_tokens to authenticated;

-- sha256 and convert_to are both in pg_catalog, which stays in scope even with
-- the search path pinned empty, so this needs no extension and no exception.
create or replace function public.hash_ingest_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

revoke all on function public.hash_ingest_token(text) from public, anon;
grant execute on function public.hash_ingest_token(text) to authenticated;

-- Issuing a token replaces whatever was there: one watch, one secret, and
-- making a new one is how you revoke the old.
create or replace function public.set_ingest_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_hash text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  -- Long enough that guessing is not a strategy. The client generates it from
  -- a cryptographic source; this only refuses anything obviously too short.
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'That token is too short to be a secret.'
      using errcode = '22023';
  end if;

  v_hash := public.hash_ingest_token(p_token);

  insert into public.ingest_tokens (user_id, token_hash)
  values (v_user_id, v_hash)
  on conflict (user_id) do update
    set token_hash = excluded.token_hash,
        created_at = now(),
        last_used_at = null;
end;
$$;

revoke all on function public.set_ingest_token(text) from public, anon;
grant execute on function public.set_ingest_token(text) to authenticated;

create or replace function public.clear_ingest_token()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  delete from public.ingest_tokens where user_id = v_user_id;
end;
$$;

revoke all on function public.clear_ingest_token() from public, anon;
grant execute on function public.clear_ingest_token() to authenticated;

-- PostgREST matches requests against a cached schema, so until it reloads,
-- every call here is refused as unknown even though it exists.
notify pgrst, 'reload schema';
