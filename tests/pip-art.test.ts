import assert from "node:assert/strict";
import test from "node:test";
import { getWeekPipMood, pipMoods } from "../src/lib/mascot";
import {
  PIP_HEIGHT,
  PIP_WIDTH,
  getPipArt,
  isPipStanding,
} from "../src/lib/pip-art";
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  PIXEL,
  getPipFrame,
  getPipPose,
} from "../src/lib/pip-pixels";

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

test("a bigger burn draws a longer flame", () => {
  const rows = (burn: number) =>
    getPipFrame("cruising", burn).filter((row) => row.includes("O")).length;

  assert.ok(rows(1) > rows(0.5), "full thrust is longer than half");
  assert.ok(rows(0.5) > rows(0.2), "half is longer than idle");
});

test("nothing Pip is made of escapes the box, or lands off the grid", () => {
  for (const mood of pipMoods) {
    for (const shape of getPipArt(mood, 1).shapes) {
      assert.equal(shape.kind, "rect", `${mood} is drawn with something else`);
      if (shape.kind !== "rect") continue;

      assert.ok(shape.x >= 0 && shape.x + shape.width <= PIP_WIDTH);
      assert.ok(shape.y >= 0 && shape.y + shape.height <= PIP_HEIGHT);
      assert.equal(shape.x % PIXEL, 0, `${mood} has a cell off the grid`);
      assert.equal(shape.y % PIXEL, 0, `${mood} has a cell off the grid`);
    }
  }
});

test("a frame is the grid, exactly, whatever the mood", () => {
  for (const mood of pipMoods) {
    const frame = getPipFrame(mood, 1);

    assert.equal(frame.length, GRID_HEIGHT, `${mood} is the wrong height`);
    for (const row of frame) {
      assert.equal(row.length, GRID_WIDTH, `${mood} has a ragged row`);
    }
  }
});

test("runs of one colour become one rectangle, not one per cell", () => {
  const shapes = getPipArt("grounded", 0.5).shapes;
  const cells = getPipFrame("grounded", 0.5)
    .join("")
    .split("")
    .filter((cell) => cell !== ".").length;

  assert.ok(
    shapes.length < cells / 2,
    `${shapes.length} shapes for ${cells} cells is not merging`,
  );
});

test("only a finished day gets its flippers up", () => {
  const cheering = pipMoods.filter((mood) => getPipPose(mood) === "cheer");

  assert.deepEqual(cheering, ["sealed"]);
});

test("nothing leans, because a rotated pixel is a smeared pixel", () => {
  assert.ok(pipMoods.every((mood) => getPipArt(mood, 0.5).tilt === 0));
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
