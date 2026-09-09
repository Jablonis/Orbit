import assert from "node:assert/strict";
import test from "node:test";
import {
  BODY_BACK,
  BODY_FRONT,
  INERT_PARTS,
  MUSCLE_SHAPES,
  groupForShape,
  heatLevel,
} from "../src/lib/body-map";
import { MUSCLE_GROUPS } from "../src/lib/exercises";
import { WEEKLY_FREQUENCY_TARGET } from "../src/lib/training-block";

const shapesInGeometry = [
  ...new Set([...Object.keys(BODY_FRONT.p), ...Object.keys(BODY_BACK.p)]),
];

test("both views carry a viewBox and some geometry", () => {
  for (const view of [BODY_FRONT, BODY_BACK]) {
    assert.match(view.vb, /^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
    assert.ok(Object.keys(view.p).length > 10);
    for (const [shape, paths] of Object.entries(view.p)) {
      assert.ok(paths.length > 0, `${shape} has no outline`);
      for (const d of paths) assert.match(d, /^M/, `${shape} is not a path`);
    }
  }
});

test("every muscle group has at least one shape to shade", () => {
  for (const group of MUSCLE_GROUPS) {
    assert.ok(MUSCLE_SHAPES[group].length > 0, `${group} draws nothing`);
    for (const shape of MUSCLE_SHAPES[group]) {
      assert.ok(
        shapesInGeometry.includes(shape),
        `${group} claims ${shape}, which the diagram cannot draw`,
      );
    }
  }
});

test("every shape belongs to exactly one group, or to the silhouette", () => {
  // A shape two groups both claimed would light up twice for one session, and
  // the picture would quietly disagree with the grid beside it.
  const claims = new Map<string, string[]>();
  for (const group of MUSCLE_GROUPS) {
    for (const shape of MUSCLE_SHAPES[group]) {
      claims.set(shape, [...(claims.get(shape) ?? []), group]);
    }
  }
  for (const [shape, groups] of claims) {
    assert.equal(groups.length, 1, `${shape} is claimed by ${groups.join(" and ")}`);
    assert.ok(!INERT_PARTS.includes(shape), `${shape} is silhouette, not muscle`);
  }

  const unclaimed = shapesInGeometry.filter(
    (shape) => !claims.has(shape) && !INERT_PARTS.includes(shape),
  );
  assert.deepEqual(unclaimed, [], "these shapes would never take a colour");
});

test("a shape resolves back to its group, and a silhouette part to nothing", () => {
  assert.equal(groupForShape("upper-back"), "back");
  assert.equal(groupForShape("hip-flexors"), "core");
  assert.equal(groupForShape("head"), null);
  assert.equal(groupForShape("not-a-muscle"), null);
});

test("the heat scale puts the weekly rule on a step of its own", () => {
  const target = WEEKLY_FREQUENCY_TARGET;
  assert.equal(heatLevel(0, target), 0);
  assert.equal(heatLevel(-1, target), 0);
  assert.equal(heatLevel(1, target), 2);
  assert.equal(heatLevel(target, target), 3);
  assert.equal(heatLevel(target * 2, target), 4);
  assert.equal(heatLevel(99, target), 4);
});

test("the scale still separates short from met when the target is high", () => {
  assert.equal(heatLevel(1, 4), 1);
  assert.equal(heatLevel(2, 4), 2);
  assert.equal(heatLevel(4, 4), 3);
  assert.equal(heatLevel(8, 4), 4);
});
