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

test("uses the user's focus target and score weights", () => {
  const result = rescoreProductivity(
    {
      current: [{ ...point, completedTasks: 1, focusMinutes: 60 }],
      previous: [point],
    },
    ["tasks", "focus"],
    {
      focusTargetMinutes: 60,
      weights: { tasks: 20, fitness: 0, focus: 80 },
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
