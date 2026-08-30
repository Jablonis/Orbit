import assert from "node:assert/strict";
import test from "node:test";
import {
  getProductivityChartPaths,
  rescoreProductivity,
} from "../src/lib/productivity-score";
import { parseDashboardPreferences } from "../src/lib/preferences";
import { getDateInTimeZone } from "../src/lib/tasks";

const point = {
  completedFitness: 1,
  completedHabits: 0,
  completedTasks: 2,
  date: "2026-07-23",
  focusMinutes: 120,
  future: false,
  label: "Thu",
  plannedFitness: 1,
  plannedHabits: 0,
  plannedTasks: 2,
  score: 100,
};

test("keeps productivity empty when every score domain is disabled", () => {
  const result = rescoreProductivity(
    { current: [point], previous: [point] },
    [],
  );

  assert.equal(result.current[0].score, null);
  assert.equal(result.previous[0].score, null);
});

test("normalizes the score across enabled domains", () => {
  const result = rescoreProductivity(
    {
      current: [{ ...point, completedTasks: 1 }],
      previous: [point],
    },
    ["tasks"],
  );

  assert.equal(result.current[0].score, 50);
  assert.equal(result.previous[0].score, 100);
});

test("uses the user's focus target and score weights", () => {
  const result = rescoreProductivity(
    {
      current: [{ ...point, completedTasks: 1, focusMinutes: 60 }],
      previous: [point],
    },
    ["tasks", "focus"],
    {
      focusTargetMinutes: 60,
      weights: { tasks: 20, fitness: 0, focus: 80, habits: 0 },
    },
  );

  assert.equal(result.current[0].score, 90);
});

test("treats an unplanned domain as missing instead of failed", () => {
  const result = rescoreProductivity(
    {
      current: [{ ...point, plannedTasks: 0, completedTasks: 0 }],
      previous: [point],
    },
    ["tasks"],
  );

  assert.equal(result.current[0].score, null);
});

test("normalizes regional preferences and rejects unsupported values", () => {
  const preferences = parseDashboardPreferences({
    regional: {
      currency: "USD",
      displayName: "  Orbit Person  ",
      initials: "op",
      locale: "en-US",
      timeZone: "America/New_York",
      weekStartsOn: "sunday",
    },
  });

  assert.equal(preferences.regional.displayName, "Orbit Person");
  assert.equal(preferences.regional.initials, "OP");
  assert.equal(preferences.regional.timeZone, "America/New_York");
  assert.equal(preferences.regional.currency, "USD");
});

test("uses the selected timezone across a UTC day boundary", () => {
  const instant = "2026-07-23T01:30:00.000Z";
  assert.equal(getDateInTimeZone(instant, "Europe/Bratislava"), "2026-07-23");
  assert.equal(getDateInTimeZone(instant, "America/Los_Angeles"), "2026-07-22");
});

test("uses summer DST offsets for every supported calendar timezone", () => {
  const cases = [
    ["UTC", "2026-07-01T00:30:00.000Z", "2026-07-01"],
    ["Europe/Bratislava", "2026-06-30T22:30:00.000Z", "2026-07-01"],
    ["Europe/London", "2026-06-30T23:30:00.000Z", "2026-07-01"],
    ["America/New_York", "2026-07-01T03:30:00.000Z", "2026-06-30"],
    ["America/Los_Angeles", "2026-07-01T06:30:00.000Z", "2026-06-30"],
  ] as const;

  for (const [timeZone, instant, expectedDate] of cases) {
    assert.equal(getDateInTimeZone(instant, timeZone), expectedDate);
  }
});

test("splits productivity chart paths at missing days without plunging to zero", () => {
  const paths = getProductivityChartPaths(
    [
      { ...point, date: "2026-07-20", score: 80 },
      { ...point, date: "2026-07-21", score: null },
      { ...point, date: "2026-07-22", score: 60 },
      { ...point, date: "2026-07-23", score: 90 },
    ],
    (index) => index * 10,
    (score) => 100 - score,
  );

  assert.equal(paths.length, 2);
  assert.equal(paths[0], "M 0 20 h 0.01");
  assert.match(paths[1], /^M 20 40 C 25 40, 25 10, 30 10$/);
  assert.doesNotMatch(paths.join(" "), /100/);
});

test("the indexed scorer answers exactly like the scanning one did", async () => {
  // A fixture built to hit every branch the old per-day scans covered: a
  // routine, a due date, a created-today one-off, a task excused by history,
  // a completion planned for another day, and a completed session.
  const { getProductivityHistory } = await import("../src/lib/dashboard");
  const calendar = {
    locale: "en-GB",
    timeZone: "UTC",
    weekStartsOn: "monday",
  } as never;
  const task = (over: Record<string, unknown>) => ({
    category: "General",
    complexity: "medium",
    completed: false,
    createdAt: "2026-08-24T08:00:00Z",
    dueDate: "",
    estimateMinutes: 30,
    estimateMode: "1hr",
    id: String(over.id),
    note: "",
    priority: "normal",
    repeatDays: [],
    timeFrom: "",
    timeTo: "",
    title: String(over.id),
    type: "admin",
    ...over,
  });
  const tasks = [
    task({ id: "routine", repeatDays: [1, 2, 3, 4, 5] }),
    task({ id: "due", dueDate: "2026-08-25" }),
    task({ id: "created" }),
    task({ id: "history" }),
  ] as never[];
  const completions = [
    {
      completedAt: "2026-08-25T10:00:00Z",
      estimateMinutes: 30,
      plannedFor: "2026-08-25",
      taskId: "history",
    },
    {
      completedAt: "2026-08-26T09:00:00Z",
      estimateMinutes: 45,
      plannedFor: "2026-08-24",
      taskId: "routine",
    },
  ];
  const sessions = [
    {
      completed: true,
      durationMinutes: 60,
      notes: "",
      performedOn: "2026-08-25",
      performedAt: "",
      quality: "medium",
    },
  ] as never[];
  const plan = [
    { date: "2026-08-25", sport: "gym" },
    { date: "2026-08-26", sport: "rest" },
  ] as never[];

  const week = getProductivityHistory(
    tasks as never,
    completions as never,
    sessions,
    plan,
    "2026-08-26",
    3,
    calendar,
  );

  // Hand-computed against the pre-index algorithm.
  assert.deepEqual(
    week.map((point) => ({
      completedFitness: point.completedFitness,
      completedTasks: point.completedTasks,
      date: point.date,
      plannedTasks: point.plannedTasks,
    })),
    [
      // Mon 24th: the routine due plus the created-today one-off; the
      // plannedFor backfill names the routine again and a Set counts it once.
      { completedFitness: 0, completedTasks: 0, date: "2026-08-24", plannedTasks: 2 },
      // Tue 25th: routine + due task + planned completion; session done.
      { completedFitness: 1, completedTasks: 1, date: "2026-08-25", plannedTasks: 3 },
      // Wed 26th: routine only planned; its completion lands today.
      { completedFitness: 0, completedTasks: 1, date: "2026-08-26", plannedTasks: 1 },
    ],
  );
});
