import assert from "node:assert/strict";
import test from "node:test";
import { getWeekPipMood, pipMoods } from "../src/lib/mascot";
import { getPipArt, isPipStanding } from "../src/lib/pip-art";

const colours = new Set(["beak", "flame", "ink", "paper", "plum"]);

test("every mood produces a drawable Pip", () => {
  for (const mood of pipMoods) {
    const art = getPipArt(mood, 0.6);

    assert.ok(art.shapes.length > 6, `${mood} is too few shapes to be a penguin`);
    for (const shape of art.shapes) {
      assert.ok(
        shape.fill || shape.stroke,
        `${mood} has a shape that paints nothing`,
      );
      if (shape.fill) assert.ok(colours.has(shape.fill));
      if (shape.stroke) assert.ok(colours.has(shape.stroke));
    }
  }
});

test("the engine only burns while leaving the ground", () => {
  for (const mood of pipMoods) {
    const art = getPipArt(mood, 1);
    const hasFlame = art.shapes.some((shape) => shape.fill === "flame");

    assert.equal(
      hasFlame,
      !isPipStanding(mood),
      `${mood} disagrees about whether it is standing`,
    );
  }
});

test("a bigger burn draws a bigger flame, and none of it escapes the box", () => {
  const small = getPipArt("cruising", 0.2).shapes.find(
    (shape) => shape.fill === "flame",
  );
  const large = getPipArt("cruising", 1).shapes.find(
    (shape) => shape.fill === "flame",
  );

  assert.ok(small?.kind === "path" && large?.kind === "path");
  assert.ok(large.d.length > 0 && small.d.length > 0);
  assert.notEqual(small.d, large.d);
});

test("only a sealed day gets the sparkles", () => {
  const sealed = getPipArt("sealed", 1);
  const soaring = getPipArt("soaring", 1);

  assert.ok(sealed.shapes.length > soaring.shapes.length);
});

test("the tilt grows with the mood and never leans backwards", () => {
  const leans = pipMoods.map((mood) => getPipArt(mood, 0.5).tilt);

  assert.ok(leans.every((deg) => deg <= 0 && deg > -25));
  assert.ok(getPipArt("sealed", 1).tilt < getPipArt("grounded", 1).tilt);
});

test("a week is judged on days held, the same as the recap", () => {
  const moods = [7, 6, 5, 4, 3, 1, 0].map((daysInOrbit) =>
    getWeekPipMood({ daysInOrbit, isBestWeek: false }),
  );

  assert.deepEqual(moods, [
    "sealed",
    "soaring",
    "soaring",
    "cruising",
    "cruising",
    "lifting",
    "asleep",
  ]);
});

test("a best week is sealed however few days it took", () => {
  assert.equal(getWeekPipMood({ daysInOrbit: 2, isBestWeek: true }), "sealed");
});
