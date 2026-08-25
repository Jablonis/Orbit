import assert from "node:assert/strict";
import test from "node:test";
import {
  getRingGeometry,
  getRingsSummary,
  isRingClosed,
} from "../src/lib/activity-rings";

const RADIUS = 99;

test("an empty ring draws nothing", () => {
  const geometry = getRingGeometry(0, RADIUS);

  assert.equal(geometry.progress, 0);
  assert.equal(geometry.laps, 0);
  assert.equal(geometry.capAngle, 0);
  assert.equal(geometry.strokeDashoffset, geometry.circumference);
});

test("a partial ring sweeps its share of the circle", () => {
  const geometry = getRingGeometry(25, RADIUS);

  assert.equal(geometry.progress, 0.25);
  assert.equal(geometry.capAngle, 90);
  assert.ok(
    Math.abs(geometry.strokeDashoffset - geometry.circumference * 0.75) < 1e-9,
  );
});

test("a closed ring is full without an overlapping head", () => {
  const geometry = getRingGeometry(100, RADIUS);

  assert.equal(geometry.progress, 1);
  assert.equal(geometry.laps, 0);
  assert.equal(geometry.capAngle, 360);
  assert.equal(geometry.strokeDashoffset, 0);
});

test("a ring past its goal keeps sweeping on top of the closed ring", () => {
  const geometry = getRingGeometry(165, RADIUS);

  assert.equal(geometry.laps, 1);
  assert.ok(Math.abs(geometry.progress - 0.65) < 1e-9);
  assert.ok(Math.abs(geometry.capAngle - 234) < 1e-9);

  const twice = getRingGeometry(200, RADIUS);
  assert.equal(twice.laps, 1);
  assert.equal(twice.progress, 1);
});

test("ring geometry survives negative, missing, and absurd values", () => {
  assert.equal(getRingGeometry(-40, RADIUS).progress, 0);
  assert.equal(getRingGeometry(Number.NaN, RADIUS).progress, 0);
  assert.ok(getRingGeometry(10_000, RADIUS).laps <= 9);
});

test("a ring is closed only at or above its goal", () => {
  assert.equal(isRingClosed(99.9), false);
  assert.equal(isRingClosed(100), true);
  assert.equal(isRingClosed(140), true);
  assert.equal(isRingClosed(Number.NaN), false);
});

test("the summary counts only the rings that are in play", () => {
  assert.deepEqual(getRingsSummary([100, 40, 100]), {
    allClosed: false,
    closed: 2,
    total: 3,
  });
  assert.deepEqual(getRingsSummary([100, 100]), {
    allClosed: true,
    closed: 2,
    total: 2,
  });
  assert.deepEqual(getRingsSummary([]), {
    allClosed: false,
    closed: 0,
    total: 0,
  });
});
