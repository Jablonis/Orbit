import assert from "node:assert/strict";
import test from "node:test";
import {
  getClosingLines,
  getEarnedToday,
  getMilestones,
  getSetupState,
} from "../src/lib/progression";

test("setup starts empty and names the first thing to do", () => {
  const state = getSetupState({
    fitnessConfigured: false,
    hasOrbitDay: false,
    taskCount: 0,
    transactionCount: 0,
  });

  assert.equal(state.done, 0);
  assert.equal(state.percent, 0);
  assert.equal(state.complete, false);
  assert.equal(state.next?.id, "tasks");
});

test("setup completes only when every step is done", () => {
  const partial = getSetupState({
    fitnessConfigured: true,
    hasOrbitDay: false,
    taskCount: 3,
    transactionCount: 12,
  });
  assert.equal(partial.done, 3);
  assert.equal(partial.percent, 75);
  assert.equal(partial.complete, false);
  assert.equal(partial.next?.id, "orbit-day");

  const full = getSetupState({
    fitnessConfigured: true,
    hasOrbitDay: true,
    taskCount: 3,
    transactionCount: 12,
  });
  assert.equal(full.complete, true);
  assert.equal(full.next, null);
});

test("milestones show what is earned and only the next one that is not", () => {
  const milestones = getMilestones({
    bestAltitude: 45,
    bestDay: 88,
    bestStreak: 9,
    orbitDays: 14,
  });
  const runs = milestones.filter((item) => item.id.startsWith("run-"));

  assert.deepEqual(
    runs.map((item) => item.id),
    ["run-3", "run-7", "run-14"],
  );
  assert.equal(runs.at(-1)?.achieved, false);
  assert.match(runs.at(-1)?.detail ?? "", /5 more days/);
  assert.ok(milestones.every((item) => item.progress >= 0 && item.progress <= 1));
});

test("an unreached tier is shown once, with the distance to it", () => {
  const milestones = getMilestones({
    bestAltitude: 45,
    bestDay: 60,
    bestStreak: 2,
    orbitDays: 4,
  });
  const tiers = milestones.filter((item) => item.id.startsWith("tier-"));

  assert.deepEqual(
    tiers.map((item) => item.id),
    ["tier-liftoff", "tier-low-orbit", "tier-mid-orbit"],
  );
  assert.equal(tiers.at(-1)?.achieved, false);
  assert.match(tiers.at(-1)?.detail ?? "", /15 altitude to go/);
});

test("a perfect day and twenty orbit days are tracked", () => {
  const early = getMilestones({
    bestAltitude: 10,
    bestDay: 40,
    bestStreak: 0,
    orbitDays: 2,
  });
  assert.equal(early.find((item) => item.id === "perfect-day")?.achieved, false);
  assert.equal(early.find((item) => item.id === "twenty-days")?.achieved, false);

  const later = getMilestones({
    bestAltitude: 95,
    bestDay: 100,
    bestStreak: 120,
    orbitDays: 44,
  });
  assert.equal(later.find((item) => item.id === "perfect-day")?.achieved, true);
  assert.equal(later.find((item) => item.id === "twenty-days")?.achieved, true);
  assert.ok(later.every((item) => item.achieved));
});

test("today is only celebrated when it is actually earned", () => {
  assert.equal(
    getEarnedToday({ ringsClosed: 1, ringsTotal: 3, todayScore: 20 }).headline,
    null,
  );
  assert.equal(
    getEarnedToday({ ringsClosed: 2, ringsTotal: 3, todayScore: 70 }).headline,
    "Today already counts.",
  );
  const closed = getEarnedToday({
    ringsClosed: 3,
    ringsTotal: 3,
    todayScore: 100,
  });
  assert.equal(closed.allClosed, true);
  assert.equal(closed.headline, "Every ring closed.");
});

test("the closing lines name the last mile, nearest ring first", () => {
  const lines = getClosingLines({
    finance: { completed: 0, percent: 0, total: 3 },
    fitness: { completed: 0, percent: 0, total: 1 },
    tasks: { completed: 5, percent: 71, total: 7 },
  });

  assert.deepEqual(
    lines.map((line) => line.system),
    ["fitness", "tasks", "finance"],
  );
  assert.equal(lines[0].text, "One session from closing fitness.");
  assert.equal(lines[1].text, "2 tasks from closing tasks.");
});

test("a closed or empty ring has nothing left to say", () => {
  const lines = getClosingLines({
    finance: { completed: 0, percent: 0, total: 0 },
    fitness: { completed: 1, percent: 100, total: 1 },
    tasks: { completed: 7, percent: 100, total: 7 },
  });

  assert.deepEqual(lines, []);
});
