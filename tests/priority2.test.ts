import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSafeReturnPath } from "../src/lib/auth-return";
import {
  buildReviewedFitnessPlan,
  defaultFitnessProfile,
  normalizeFitnessProfile,
} from "../src/lib/fitness-setup";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("authentication return paths allow only Orbit routes", () => {
  assert.equal(getSafeReturnPath("/fitness?view=plan"), "/fitness?view=plan");
  assert.equal(getSafeReturnPath("/tasks/archived"), "/tasks/archived");
  assert.equal(
    getSafeReturnPath("/reset-password?next=%2Ffitness"),
    "/reset-password?next=%2Ffitness",
  );
  assert.equal(getSafeReturnPath("https://example.com/fitness"), "/");
  assert.equal(getSafeReturnPath("//example.com"), "/");
  assert.equal(getSafeReturnPath("/login"), "/");
  assert.equal(getSafeReturnPath("/\\example.com"), "/");
});

test("reviewed Fitness setup produces seven explicit plan days", () => {
  const plan = buildReviewedFitnessPlan(defaultFitnessProfile);
  assert.equal(plan.length, 7);
  assert.equal(new Set(plan.map((day) => day.weekday)).size, 7);
  assert.deepEqual(
    plan.filter((day) => day.sport !== "rest").map((day) => day.weekday),
    ["monday", "wednesday", "friday"],
  );
  assert.ok(
    plan
      .filter((day) => day.sport !== "rest")
      .every((day) => day.planned_duration_minutes === 45),
  );
});

test("Fitness setup rejects incomplete or unknown choices", () => {
  assert.equal(
    normalizeFitnessProfile({
      availableDays: [],
      equipment: ["bodyweight"],
      exercisesToAvoid: "",
      experience: "beginner",
      goal: "general_fitness",
      sessionLengthMinutes: 45,
    }),
    null,
  );
  assert.equal(
    normalizeFitnessProfile({
      availableDays: ["monday"],
      equipment: ["unknown"],
      exercisesToAvoid: "",
      experience: "beginner",
      goal: "general_fitness",
      sessionLengthMinutes: 45,
    }),
    null,
  );
});

test("Settings dismissal, Quick Add retry, and recovery states are explicit", () => {
  const profileMenu = read("src/components/ProfileMenu.tsx");
  const quickAdd = read("src/components/QuickAdd.tsx");
  const login = read("src/app/login/LoginForm.tsx");

  assert.match(profileMenu, /Discard unsaved changes\?/);
  assert.match(profileMenu, /onCancel=/);
  assert.match(profileMenu, /guardLogout/);
  assert.match(profileMenu, /beforeunload/);
  assert.match(quickAdd, /Orbit data search is unavailable/);
  assert.match(quickAdd, />\s*Retry\s*</);
  assert.match(login, /Forgot password\?/);
  assert.match(read("src/app/auth/callback/route.ts"), /exchangeCodeForSession/);
  assert.match(read("src/app/reset-password/ResetPasswordForm.tsx"), /new-password/);
});

test("Fitness copy is English and locale control names its real behavior", () => {
  const fitness = `${read("src/lib/fitness.ts")}\n${read(
    "src/app/fitness/FitnessClient.tsx",
  )}`;
  const customizer = read("src/components/DashboardCustomizer.tsx");

  for (const mixedCopy of [
    "Mobilita",
    "Silovy trening",
    "gym session za tyzden",
  ]) {
    assert.doesNotMatch(fitness, new RegExp(mixedCopy));
  }
  assert.match(customizer, /Date and number format/);
  assert.doesNotMatch(customizer, /Language and dates/);
});

test("opening Fitness without a plan does not create one silently", () => {
  const fitness = read("src/lib/fitness.ts");
  const page = read("src/app/fitness/page.tsx");
  const migration = read(
    "supabase/migrations/20260724064413_add_fitness_setup_profiles.sql",
  );

  const ensureBody = fitness.slice(
    fitness.indexOf("export async function ensureFitnessPlan"),
    fitness.indexOf("export function createUnconfiguredWeeklyPlan"),
  );
  assert.doesNotMatch(ensureBody, /replace_fitness_plan|\.insert\(/);
  assert.match(page, /No plan is active/);
  assert.match(page, /FitnessSetupForm/);
  assert.match(migration, /alter table public\.fitness_profiles enable row level security/);
  assert.match(migration, /configure_fitness_plan/);
  assert.match(migration, /auth\.uid\(\)/);
});
