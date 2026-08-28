import assert from "node:assert/strict";
import test from "node:test";
import {
  type Habit,
  getDayHabits,
  getHabitHold,
  getHabitRing,
  habitHoldSentence,
  isHabitDoneOn,
  isHabitDueOn,
  isMissingHabitsSchema,
} from "../src/lib/habits";
import { getDailyRings } from "../src/lib/dashboard";
import { scorePoint } from "../src/lib/productivity-score";

const habit = (over: Partial<Habit> = {}): Habit => ({
  createdAt: "2026-08-01T08:00:00.000Z",
  id: "h1",
  name: "Read",
  // Monday, Wednesday, Friday.
  repeatDays: [1, 3, 5],
  ...over,
});

// 2026-08-24 is a Monday.
const MONDAY = "2026-08-24";
const TUESDAY = "2026-08-25";

test("a habit is asked for on its own days and no others", () => {
  assert.equal(isHabitDueOn(habit(), MONDAY), true);
  assert.equal(isHabitDueOn(habit(), TUESDAY), false);
});

test("a habit does not arrive already behind", () => {
  const written = habit({ createdAt: "2026-08-26T08:00:00.000Z" });

  assert.equal(isHabitDueOn(written, MONDAY), false);
  assert.equal(isHabitDueOn(written, "2026-08-28"), true);
});

test("keeping a habit is per date, so tomorrow asks again", () => {
  const checks = [{ date: MONDAY, habitId: "h1" }];

  assert.equal(isHabitDoneOn(checks, "h1", MONDAY), true);
  assert.equal(isHabitDoneOn(checks, "h1", "2026-08-26"), false);
});

test("a day only shows the habits it actually asks for", () => {
  const habits = [habit(), habit({ id: "h2", name: "Slovak", repeatDays: [2] })];

  assert.deepEqual(
    getDayHabits(habits, [{ date: MONDAY, habitId: "h1" }], MONDAY).map(
      (entry) => [entry.habit.id, entry.done],
    ),
    [["h1", true]],
  );
  assert.deepEqual(
    getDayHabits(habits, [], TUESDAY).map((entry) => entry.habit.id),
    ["h2"],
  );
});

test("the ring is what today asked for, not everything ever written down", () => {
  const habits = [habit(), habit({ id: "h2", name: "Walk", repeatDays: [1] })];
  const ring = getHabitRing(habits, [{ date: MONDAY, habitId: "h1" }], MONDAY);

  assert.deepEqual(ring, { completed: 1, percent: 50, total: 2 });
});

test("a day with no habit due has no habit ring to close", () => {
  assert.deepEqual(getHabitRing([habit()], [], TUESDAY), {
    completed: 0,
    percent: 0,
    total: 0,
  });
});

test("a habit is held at a rate, so one bad Tuesday does not erase it", () => {
  const dates = ["2026-08-17", "2026-08-19", "2026-08-21", MONDAY];
  const hold = getHabitHold(
    habit(),
    [
      { date: "2026-08-17", habitId: "h1" },
      { date: "2026-08-21", habitId: "h1" },
      { date: MONDAY, habitId: "h1" },
    ],
    dates,
  );

  assert.deepEqual(hold, { done: 3, due: 4, percent: 75 });
  assert.equal(habitHoldSentence(hold), "Kept 3 of the last 4");
  assert.equal(
    habitHoldSentence({ done: 0, due: 0, percent: 0 }),
    "Not asked for yet",
  );
});

test("habits take a share of the day only on the days they are asked for", () => {
  const base = {
    completedFitness: 0,
    completedHabits: 0,
    completedTasks: 1,
    date: MONDAY,
    focusMinutes: 0,
    future: false,
    label: "Mon",
    plannedFitness: 0,
    plannedHabits: 0,
    plannedTasks: 1,
    score: null,
  };
  const domains = ["tasks", "fitness", "focus", "habits"] as const;

  // No habit due: the score is exactly what it was before habits existed.
  const withoutHabits = scorePoint(base, [...domains]);
  // One due and missed: the day is no longer complete.
  const missed = scorePoint({ ...base, plannedHabits: 1 }, [...domains]);
  // One due and kept: more of the day was asked for, and more of it was done.
  const kept = scorePoint(
    { ...base, completedHabits: 1, plannedHabits: 1 },
    [...domains],
  );

  assert.equal(withoutHabits, 80);
  assert.equal(missed, 60);
  assert.equal(kept, 85);
});

test("the daily rings carry habits without a caller having to pass them", () => {
  const training = {
    day: { date: MONDAY, log: { completed: false }, sport: "rest" },
  } as unknown as Parameters<typeof getDailyRings>[2];

  assert.deepEqual(
    getDailyRings([], [], training, MONDAY, "Europe/Bratislava").habits,
    { completed: 0, percent: 0, total: 0 },
  );
  assert.deepEqual(
    getDailyRings([], [], training, MONDAY, "Europe/Bratislava", {
      checks: [{ date: MONDAY, habitId: "h1" }],
      habits: [habit()],
    }).habits,
    { completed: 1, percent: 100, total: 1 },
  );
});

test("a database without the habits migration reads as an account with none", () => {
  assert.equal(isMissingHabitsSchema({ code: "42P01" }), true);
  assert.equal(isMissingHabitsSchema({ code: "PGRST205" }), true);
  assert.equal(isMissingHabitsSchema({ code: "PGRST202" }), true);
  assert.equal(isMissingHabitsSchema({ code: "23505" }), false);
  assert.equal(isMissingHabitsSchema(null), false);
});
