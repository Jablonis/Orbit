import assert from "node:assert/strict";
import test from "node:test";
import { getDayDetail } from "../src/lib/day-detail";
import type { ProductivityPoint } from "../src/lib/productivity-score";

function point(overrides: Partial<ProductivityPoint> = {}): ProductivityPoint {
  return {
    completedFitness: 0,
    completedHabits: 0,
    completedTasks: 0,
    date: "2026-08-24",
    focusMinutes: 0,
    future: false,
    label: "Mon",
    plannedFitness: 0,
    plannedHabits: 0,
    plannedTasks: 0,
    score: 0,
    ...overrides,
  };
}

test("a day that counted says so", () => {
  const detail = getDayDetail(
    point({
      completedFitness: 1,
      completedHabits: 0,
      completedTasks: 3,
      focusMinutes: 95,
      plannedFitness: 1,
      plannedHabits: 0,
      plannedTasks: 4,
      score: 78,
    }),
    "2026-08-26",
  );

  assert.equal(detail.inOrbit, true);
  assert.deepEqual(detail.figures.map((figure) => figure.value), [
    "3/4",
    "Done",
    "95 min",
  ]);
  assert.match(detail.note, /^Above the line\./);
});

test("a day that fell short says how short", () => {
  const detail = getDayDetail(
    point({ completedTasks: 1, plannedTasks: 4, score: 15 }),
    "2026-08-26",
  );

  assert.equal(detail.inOrbit, false);
  assert.equal(detail.note, "35 short of the line that makes a day count.");
});

test("a day nothing was asked of is not a failure", () => {
  const detail = getDayDetail(point({ score: 0 }), "2026-08-26");

  assert.equal(detail.note, "Nothing was planned, so nothing was scored.");
});

test("a day that has not happened has no score to show", () => {
  const tomorrow = getDayDetail(
    point({ date: "2026-08-27", future: true, plannedFitness: 1, score: null }),
    "2026-08-26",
  );
  const now = getDayDetail(
    point({ date: "2026-08-26", future: true, score: null }),
    "2026-08-26",
  );

  assert.equal(tomorrow.score, null);
  assert.equal(tomorrow.figures[1].value, "Planned");
  assert.equal(tomorrow.note, "Not yet. This day has not happened.");
  assert.equal(now.note, "Still going.");
});
