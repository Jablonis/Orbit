import assert from "node:assert/strict";
import test from "node:test";
import { rescoreProductivity } from "../src/lib/productivity-score";

const point = {
  completedFitness: 1,
  completedTasks: 2,
  date: "2026-07-23",
  focusMinutes: 120,
  future: false,
  label: "Thu",
  plannedFitness: 1,
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
