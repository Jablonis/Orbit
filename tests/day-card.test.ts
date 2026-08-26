import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY_CARD_HEIGHT,
  DAY_CARD_WIDTH,
  drawDayCard,
} from "../src/lib/day-card-canvas";

type Recorder = {
  arcs: number[];
  context: CanvasRenderingContext2D;
  texts: string[];
};

function fakeContext(): Recorder {
  const texts: string[] = [];
  const arcs: number[] = [];
  const context = {
    arc: (_x: number, _y: number, radius: number) => arcs.push(radius),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    beginPath: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fill: () => {},
    fillRect: () => {},
    fillText: (value: string) => texts.push(value),
    lineTo: () => {},
    moveTo: () => {},
    stroke: () => {},
  } as unknown as CanvasRenderingContext2D;

  return { arcs, context, texts };
}

const content = {
  altitude: 65,
  date: "24 August 2026",
  ghost: "You are 64 points ahead of last week's you.",
  metrics: [
    { label: "Altitude", value: "65" },
    { label: "Streak", value: "14 d" },
  ],
  mood: "soaring" as const,
  tierName: "Mid orbit",
  trace: [40, 55, 70, 0, 65],
};

test("the day card is a portrait image sized for sharing", () => {
  assert.ok(DAY_CARD_HEIGHT > DAY_CARD_WIDTH);
  assert.equal(DAY_CARD_WIDTH % 2, 0);
});

test("the day card renders the orbit, the tier, and every metric", () => {
  const recorder = fakeContext();
  drawDayCard(recorder.context, content, "#a3e635");

  assert.ok(recorder.texts.includes("ORBIT"));
  assert.ok(recorder.texts.includes("Mid orbit"));
  assert.ok(recorder.texts.includes("65"));
  assert.ok(recorder.texts.includes("ALTITUDE"));
  assert.ok(recorder.texts.includes("STREAK"));
  assert.ok(recorder.texts.includes("24 AUGUST 2026"));
  assert.ok(recorder.arcs.some((radius) => radius > 100));
});

test("the day card survives an empty history and out-of-range altitude", () => {
  const recorder = fakeContext();
  drawDayCard(
    recorder.context,
    { ...content, altitude: 240, metrics: [], trace: [] },
    "#a3e635",
  );

  assert.ok(recorder.texts.includes("240"));
  assert.ok(recorder.arcs.every((radius) => radius <= 340));
});

test("the shared verdict line is truncated instead of overflowing", () => {
  const recorder = fakeContext();
  drawDayCard(
    recorder.context,
    { ...content, ghost: "x".repeat(200) },
    "#a3e635",
  );

  assert.ok(recorder.texts.some((value) => value.length === 64));
  assert.ok(recorder.texts.every((value) => value.length <= 64));
});
