import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { getContentSecurityPolicy } from "../src/proxy";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("production CSP requires a per-request script nonce", () => {
  const policy = getContentSecurityPolicy("orbit-test-nonce", "production");
  const scriptSrc = policy.match(/script-src[^;]+/)?.[0] ?? "";

  assert.match(
    policy,
    /script-src 'self' 'nonce-orbit-test-nonce' 'strict-dynamic'/,
  );
  assert.doesNotMatch(scriptSrc, /'unsafe-inline'/);
  assert.doesNotMatch(scriptSrc, /'unsafe-eval'/);
});

test("every interactive route stays dynamic, because the CSP nonce demands it", () => {
  // A prerendered page is built before the request that carries the nonce, so
  // 'strict-dynamic' refuses its scripts and it renders without JavaScript.
  for (const route of [
    "src/app/page.tsx",
    "src/app/welcome/page.tsx",
    "src/app/tasks/page.tsx",
    "src/app/fitness/page.tsx",
    "src/app/finance/page.tsx",
    "src/app/login/page.tsx",
    "src/app/crew/page.tsx",
    "src/app/habits/page.tsx",
  ]) {
    assert.match(
      read(route),
      /export const dynamic = "force-dynamic"/,
      `${route} must opt out of static prerendering`,
    );
  }
});

test("every route can fail without falling out of Orbit", () => {
  // A route with no error boundary hands its failure to the platform, and the
  // visitor gets an opaque reference number instead of a page that says what
  // to do. Both new routes shipped without one, which is why two failures came
  // back as bare Vercel references.
  for (const route of ["tasks", "fitness", "finance", "habits", "crew"]) {
    assert.ok(
      existsSync(new URL(`../src/app/${route}/error.tsx`, import.meta.url)),
      `${route} needs an error boundary`,
    );
    assert.ok(
      existsSync(new URL(`../src/app/${route}/loading.tsx`, import.meta.url)),
      `${route} needs a loading state`,
    );
  }
});

test("every page behind the login is turned away at the edge, not mid-render", () => {
  // A page that reaches its own `getAuthenticatedUser` has already flushed a
  // shell, so the redirect arrives as a client-side one: a flash of empty
  // chrome, and the destination lost. Adding a route to the app and forgetting
  // this list is the whole failure mode, so the list is asserted rather than
  // remembered.
  const proxy = read("src/lib/supabase/proxy.ts");
  const listed = proxy
    .slice(proxy.indexOf("const protectedRoutes = ["))
    .split("]")[0];

  for (const route of [
    "/",
    "/tasks",
    "/fitness",
    "/habits",
    "/finance",
    "/crew",
  ]) {
    assert.match(
      listed,
      new RegExp(`"${route}"`),
      `${route} must be guarded before it renders`,
    );
  }
});

test("fitness plan history is owner-scoped and unavailable to anonymous clients", () => {
  const migration = read(
    "supabase/migrations/20260724055049_harden_fitness_plan_version_grants.sql",
  );
  const writeLock = read(
    "supabase/migrations/20260724060953_lock_fitness_plan_writes_to_rpcs.sql",
  );
  const snapshotTrigger = read(
    "supabase/migrations/20260724061122_enforce_fitness_plan_snapshots_with_trigger.sql",
  );
  const schema = read(
    "supabase/migrations/20260724054232_add_versioned_fitness_plans.sql",
  );

  assert.match(schema, /enable row level security/i);
  assert.match(schema, /\(select auth\.uid\(\)\)\s*=\s*user_id/i);
  assert.match(schema, /revoke all on function[\s\S]+from public, anon/i);
  assert.match(
    migration,
    /revoke all on table public\.fitness_plan_versions from public, anon/i,
  );
  assert.match(
    writeLock,
    /revoke insert, update, delete on table public\.fitness_plan_versions\s+from authenticated/i,
  );
  assert.match(
    writeLock,
    /grant select on table public\.fitness_plan_versions to authenticated/i,
  );
  assert.equal(
    [...snapshotTrigger.matchAll(/security invoker/gi)].length,
    2,
    "both authenticated plan RPCs must remain security-invoker",
  );
  assert.match(snapshotTrigger, /create trigger fitness_plan_day_snapshot/i);
  assert.match(
    snapshotTrigger,
    /revoke all on function public\.snapshot_fitness_plan_day\(\)\s+from public, anon, authenticated/i,
  );
});

test("the statement import keeps layered request limits ahead of PDF parsing", () => {
  const route = read("src/app/api/finance/import-statement/route.ts");
  const contentLengthCheck = route.indexOf("contentLength > maxRequestBytes");
  const rateLimitCheck = route.indexOf("consume_finance_statement_rate_limit");
  const boundedRead = route.indexOf("readBoundedBody(request, maxRequestBytes)");
  const parse = route.indexOf("extractBankStatementText(bytes)");

  assert.ok(contentLengthCheck >= 0);
  assert.ok(rateLimitCheck > contentLengthCheck);
  assert.ok(boundedRead > rateLimitCheck);
  assert.ok(parse > boundedRead);
});

test("a crew member can read a published day and nothing underneath it", () => {
  const migration = read("supabase/migrations/20260825140000_add_crew.sql");

  // Every crew table is locked to reads, and every read is gated on a link.
  for (const table of [
    "orbit_profiles",
    "friendships",
    "orbit_snapshots",
    "orbit_reactions",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      `${table} must have RLS on`,
    );
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from public, anon`, "i"),
      `${table} must be unavailable to anonymous clients`,
    );
    assert.match(
      migration,
      new RegExp(
        `revoke insert, update, delete on table public\\.${table}\\s+from authenticated`,
        "i",
      ),
      `${table} must only be written through a function`,
    );
  }

  // A snapshot is readable by its owner or an accepted crew member, never
  // anyone else, and a pending request only ever exposes a name.
  assert.match(
    migration,
    /create policy "orbit_snapshots_select_crew"[\s\S]+?using \([\s\S]+?public\.is_crew\(\(select auth\.uid\(\)\), user_id\)/i,
  );
  assert.match(
    migration,
    /create policy "orbit_profiles_select_crew"[\s\S]+?public\.has_crew_link/i,
  );
  assert.match(
    migration,
    /create policy "friendships_select_own"[\s\S]+?in \(requester_id, addressee_id\)/i,
  );

  // Every crew function is security definer with a pinned search path, and
  // none of them is reachable anonymously.
  const functions = [
    "ensure_orbit_profile",
    "request_friendship",
    "respond_to_friendship",
    "remove_friendship",
    "publish_orbit_snapshot",
    "react_to_day",
    "is_crew",
    "has_crew_link",
  ];
  for (const name of functions) {
    assert.match(
      migration,
      new RegExp(
        `create or replace function public\\.${name}\\([\\s\\S]*?security definer\\s+set search_path = public, pg_temp`,
        "i",
      ),
      `${name} must be a security-definer function with a pinned search path`,
    );
    assert.match(
      migration,
      new RegExp(`revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon`, "i"),
      `${name} must be unavailable to anonymous clients`,
    );
  }

  // A snapshot is keyed on the caller, never on anything the client sends.
  assert.doesNotMatch(
    migration,
    /create or replace function public\.publish_orbit_snapshot\([\s\S]+?p_user_id/i,
  );
  assert.match(
    migration,
    /create or replace function public\.react_to_day[\s\S]+?if not public\.is_crew\(v_user_id, p_to_user\) then\s+raise exception/i,
  );
});

test("habits are owner-only, and every write goes through a pinned function", () => {
  const migration = read("supabase/migrations/20260828090000_add_habits.sql");

  for (const table of ["habits", "habit_checks"]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      `${table} must have row level security on`,
    );
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from public, anon`, "i"),
      `${table} must be unreachable anonymously`,
    );
    assert.match(
      migration,
      new RegExp(
        `revoke insert, update, delete on table public\\.${table} from authenticated`,
        "i",
      ),
      `${table} must be written only through functions`,
    );
    assert.match(
      migration,
      new RegExp(
        `create policy "${table}_select_own"[\\s\\S]*?using \\(user_id = \\(select auth\\.uid\\(\\)\\)\\)`,
        "i",
      ),
      `${table} must only ever return the caller's own rows`,
    );
  }

  for (const name of ["save_habit", "archive_habit", "set_habit_check"]) {
    assert.match(
      migration,
      new RegExp(
        `create or replace function public\\.${name}\\([\\s\\S]*?security definer\\s+set search_path = ''`,
        "i",
      ),
      `${name} must be a security-definer function with a pinned search path`,
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon`,
        "i",
      ),
      `${name} must be unavailable to anonymous clients`,
    );
  }

  // The owner is decided by the function, never sent by the client, and every
  // statement that touches a habit is fenced by it.
  assert.doesNotMatch(migration, /p_user_id/i);
  assert.equal(
    (migration.match(/v_user_id uuid := \(select auth\.uid\(\)\)/g) ?? []).length,
    3,
  );
});

test("a watch token is stored as a fingerprint, never in the clear", () => {
  const migration = read("supabase/migrations/20260829090000_add_ingest_tokens.sql");

  // The column is a hash and the constraint says so, so a plaintext token
  // cannot be written into it even by mistake.
  assert.match(migration, /token_hash text not null unique check \(token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/i);
  // A column literally called `token`, as opposed to the `p_token` parameter
  // the functions take — the secret arrives, is hashed, and is not kept.
  assert.doesNotMatch(migration, /^\s+token text/im);

  assert.match(
    migration,
    /alter table public\.ingest_tokens enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.ingest_tokens from public, anon/i,
  );
  assert.match(
    migration,
    /revoke insert, update, delete on table public\.ingest_tokens from authenticated/i,
  );

  for (const name of ["hash_ingest_token", "set_ingest_token", "clear_ingest_token"]) {
    assert.match(
      migration,
      new RegExp(
        `create or replace function public\\.${name}\\([\\s\\S]*?security definer\\s+set search_path = ''`,
        "i",
      ),
      `${name} must pin its search path`,
    );
    assert.match(
      migration,
      new RegExp(`revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon`, "i"),
      `${name} must be unavailable to anonymous clients`,
    );
  }
});

test("the ingest endpoint never tells a prober which token exists", () => {
  const route = read("src/app/api/fitness/ingest/route.ts");

  // The same answer for a wrong token and a missing row.
  assert.match(route, /if \(!owner\) return bad\("Unknown token\.", 401\)/);
  // The service-role key stays server-side: this route may use the admin
  // client, but nothing about it may be handed to a browser.
  assert.doesNotMatch(route, /NEXT_PUBLIC_SUPABASE_SERVICE|SERVICE_ROLE_KEY/);
});
