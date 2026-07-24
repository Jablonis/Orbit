import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getContentSecurityPolicy } from "../src/proxy";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("production CSP requires a per-request script nonce", () => {
  const policy = getContentSecurityPolicy("orbit-test-nonce", "production");

  assert.match(
    policy,
    /script-src 'self' 'nonce-orbit-test-nonce' 'strict-dynamic'/,
  );
  assert.doesNotMatch(
    policy.match(/script-src[^;]+/)?.[0] ?? "",
    /'unsafe-inline'/,
  );
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
