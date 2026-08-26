import assert from "node:assert/strict";
import test from "node:test";
import { getAscent, getAscentLine } from "../src/lib/ascent";
import { ORBIT_DAY_SCORE } from "../src/lib/momentum";

const areas = (
  tasks: [number, number],
  fitness: [number, number],
  finance: [number, number],
) => [
  {
    completed: tasks[0],
    label: "Tasks",
    percent: tasks[1] ? (tasks[0] / tasks[1]) * 100 : 0,
    system: "tasks" as const,
    total: tasks[1],
  },
  {
    completed: fitness[0],
    label: "Fitness",
    percent: fitness[1] ? (fitness[0] / fitness[1]) * 100 : 0,
    system: "fitness" as const,
    total: fitness[1],
  },
  {
    completed: finance[0],
    label: "Finance",
    percent: finance[1] ? (finance[0] / finance[1]) * 100 : 0,
    system: "finance" as const,
    total: finance[1],
  },
];

test("a column rises with its area and never falls out of the frame", () => {
  const ascent = getAscent({
    areas: areas([1, 3], [1, 1], [0, 2]),
    todayScore: 40,
  });

  const [tasks, fitness, finance] = ascent.columns;
  assert.ok(tasks.height > 0.3 && tasks.height < 0.4);
  assert.equal(fitness.height, 1);
  assert.ok(finance.height > 0);
  assert.ok(ascent.columns.every((column) => column.height <= 1));
});

test("an area with nothing planned is dormant, not failed", () => {
  const [, , finance] = getAscent({
    areas: areas([1, 3], [1, 1], [0, 0]),
    todayScore: 40,
  }).columns;

  assert.equal(finance.idle, true);
  assert.equal(finance.closed, false);
  assert.equal(finance.value, "—");
  assert.ok(finance.height > 0, "a pad is still drawn");
});

test("only planned areas are counted, so an empty one cannot be missing", () => {
  const ascent = getAscent({
    areas: areas([3, 3], [1, 1], [0, 0]),
    todayScore: 90,
  });

  assert.equal(ascent.total, 2);
  assert.equal(ascent.closed, 2);
  assert.equal(getAscentLine(ascent), "Every stage is done.");
});

test("the line is the score that makes a day count, not a decoration", () => {
  const below = getAscent({ areas: areas([1, 3], [0, 1], [0, 1]), todayScore: ORBIT_DAY_SCORE - 1 });
  const above = getAscent({ areas: areas([1, 3], [0, 1], [0, 1]), todayScore: ORBIT_DAY_SCORE });

  assert.equal(below.inOrbit, false);
  assert.equal(above.inOrbit, true);
  assert.equal(above.orbitLine, ORBIT_DAY_SCORE / 100);
  assert.ok(below.altitude < below.orbitLine);
  assert.ok(above.altitude >= above.orbitLine);
});

test("a day with nothing logged still draws, at the floor", () => {
  const ascent = getAscent({
    areas: areas([0, 2], [0, 1], [0, 1]),
    todayScore: null,
  });

  assert.equal(ascent.altitude, 0);
  assert.equal(ascent.closed, 0);
  assert.ok(ascent.columns.every((column) => column.height > 0));
  assert.equal(getAscentLine(ascent), "0 of 3 stages done, below the line.");
});

test("an unplanned day says so rather than reporting zero of zero", () => {
  const ascent = getAscent({
    areas: areas([0, 0], [0, 0], [0, 0]),
    todayScore: null,
  });

  assert.equal(ascent.total, 0);
  assert.equal(getAscentLine(ascent), "Nothing is planned yet today.");
});

test("an overshooting area is capped at the top of the frame", () => {
  const [tasks] = getAscent({
    areas: areas([9, 3], [0, 1], [0, 1]),
    todayScore: 140,
  }).columns;

  assert.equal(tasks.height, 1);
  assert.equal(tasks.percent, 100);
});
