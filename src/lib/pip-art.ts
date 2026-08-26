/**
 * Pip, as geometry rather than as markup.
 *
 * Pip appears in the interface as SVG and on the shared images as canvas. Two
 * drawings of one character drift apart the first time either is touched, so
 * there is only one: this module returns the shapes, and each renderer knows
 * how to put them on its own surface.
 *
 * Coordinates are in Pip's own 72 × 104 box. Colours are named rather than
 * literal, because the paper cards and the dark share images do not agree on
 * what black is.
 */

import type { PipMood } from "@/lib/mascot";

export const PIP_WIDTH = 72;
export const PIP_HEIGHT = 104;

export type PipColor = "beak" | "flame" | "ink" | "paper" | "plum";

export type PipRotation = { deg: number; x: number; y: number };

type Common = {
  fill?: PipColor;
  opacity?: number;
  rotate?: PipRotation;
  stroke?: PipColor;
  width?: number;
};

export type PipShape =
  | (Common & { cap?: "round"; d: string; kind: "path" })
  | (Common & { cx: number; cy: number; kind: "circle"; r: number })
  | (Common & { cx: number; cy: number; kind: "ellipse"; rx: number; ry: number })
  | (Common & {
      height: number;
      kind: "rect";
      radius: number;
      width: number;
      x: number;
      y: number;
    });

export type PipArt = {
  shapes: PipShape[];
  /** Degrees the whole character leans, around the middle of its body. */
  tilt: number;
};

const tilt: Record<PipMood, number> = {
  asleep: 0,
  cruising: -10,
  grounded: -2,
  lifting: -6,
  sealed: -15,
  soaring: -13,
};

/** Feet are for standing. In flight they tuck up against the pack. */
const standing: Record<PipMood, boolean> = {
  asleep: true,
  cruising: false,
  grounded: true,
  lifting: false,
  sealed: false,
  soaring: false,
};

/** Flippers sweep back the faster the day is going. */
const sweep: Record<PipMood, number> = {
  asleep: 0,
  cruising: 26,
  grounded: 4,
  lifting: 16,
  sealed: 38,
  soaring: 34,
};

export function isPipStanding(mood: PipMood) {
  return standing[mood];
}

/**
 * Every shape Pip is made of, in paint order.
 *
 * `burn` is how much engine shows, 0–1. On the ground it shows none: the flame
 * is what leaving looks like, not what standing looks like.
 */
export function getPipArt(mood: PipMood, burn = 0.5): PipArt {
  const flame = standing[mood] ? 0 : Math.max(0.15, Math.min(1, burn));
  const swept = sweep[mood];
  const happy = mood === "soaring" || mood === "sealed";
  const shapes: PipShape[] = [];

  // Thrust, first so nothing it could hide behind is drawn under it.
  if (flame > 0) {
    shapes.push(
      {
        d: `M36 82c7 ${7 * flame} 6 ${15 * flame} 0 ${21 * flame}c-6 ${-6 * flame} -7 ${-14 * flame} 0 ${-21 * flame}Z`,
        fill: "beak",
        kind: "path",
        opacity: 0.85,
      },
      {
        d: `M36 82c3.5 ${4 * flame} 3 ${8 * flame} 0 ${12 * flame}c-3 ${-4 * flame} -3.5 ${-8 * flame} 0 ${-12 * flame}Z`,
        fill: "flame",
        kind: "path",
      },
    );
  }

  // Feet, or the pack they tuck up against.
  if (standing[mood]) {
    shapes.push(
      { d: "M30 76c-6 2-8 6-7 9h11v-9Z", fill: "beak", kind: "path" },
      { d: "M42 76c6 2 8 6 7 9H38v-9Z", fill: "beak", kind: "path" },
    );
  } else {
    shapes.push({
      d: "M28 74h16a4 4 0 0 1 4 4v4H24v-4a4 4 0 0 1 4-4Z",
      fill: "plum",
      kind: "path",
    });
  }

  shapes.push(
    {
      d: "M18 48c-5 5-7 13-5 20l8-8Z",
      fill: "ink",
      kind: "path",
      rotate: { deg: swept, x: 19, y: 49 },
    },
    {
      d: "M54 48c5 5 7 13 5 20l-8-8Z",
      fill: "ink",
      kind: "path",
      rotate: { deg: -swept, x: 53, y: 49 },
    },
    // One shell: head and body, the way a penguin is actually shaped.
    {
      d: "M36 12c13 0 21 13 21 32 0 21-9 34-21 34s-21-13-21-34c0-19 8-32 21-32Z",
      fill: "ink",
      kind: "path",
    },
    { cx: 36, cy: 54, fill: "paper", kind: "ellipse", rx: 14, ry: 21 },
    { cx: 36, cy: 36, fill: "paper", kind: "ellipse", rx: 13.5, ry: 12 },
    ...getFace(mood, happy),
    // The helmet: the Orbit ring, worn. The collar closes it, so the ring reads
    // as glass over the head rather than a line through the body.
    { cx: 36, cy: 34, fill: "plum", kind: "circle", opacity: 0.08, r: 22 },
    {
      cx: 36,
      cy: 34,
      kind: "circle",
      opacity: 0.5,
      r: 22,
      stroke: "plum",
      width: 2.5,
    },
    {
      cap: "round",
      d: "M21 22a21 21 0 0 1 11-7",
      kind: "path",
      opacity: 0.75,
      stroke: "paper",
      width: 3,
    },
    {
      fill: "plum",
      height: 7,
      kind: "rect",
      opacity: 0.75,
      radius: 3.5,
      width: 38,
      x: 17,
      y: 50,
    },
  );

  if (mood === "sealed") {
    shapes.push(
      {
        d: "M63 16l1.3 3.2 3.2 1.3-3.2 1.3L63 25l-1.3-3.2-3.2-1.3 3.2-1.3Z",
        fill: "beak",
        kind: "path",
      },
      {
        d: "M8 30l1 2.4 2.4 1-2.4 1L8 36.8l-1-2.4L4.6 33.4l2.4-1Z",
        fill: "beak",
        kind: "path",
      },
    );
  }

  return { shapes, tilt: tilt[mood] };
}

/** The whole personality: two eyes and a beak. */
function getFace(mood: PipMood, happy: boolean): PipShape[] {
  if (mood === "asleep" || happy) {
    const y = mood === "asleep" ? 34 : 35;
    const lift = mood === "asleep" ? 2 : 2.4;
    return [
      {
        cap: "round",
        d: `M26 ${y}c1.4-${lift} 4-${lift} 5.4 0`,
        kind: "path",
        stroke: "ink",
        width: 2.2,
      },
      {
        cap: "round",
        d: `M40.6 ${y}c1.4-${lift} 4-${lift} 5.4 0`,
        kind: "path",
        stroke: "ink",
        width: 2.2,
      },
      happy
        ? { d: "M30 42h12l-6 9Z", fill: "beak", kind: "path" }
        : { d: "M30 41h12l-6 6Z", fill: "beak", kind: "path" },
    ];
  }

  const r = mood === "lifting" ? 3.4 : 3;
  return [
    { cx: 29, cy: 34, fill: "ink", kind: "circle", r },
    { cx: 43, cy: 34, fill: "ink", kind: "circle", r },
    { cx: 30.1, cy: 32.9, fill: "paper", kind: "circle", r: 1 },
    { cx: 44.1, cy: 32.9, fill: "paper", kind: "circle", r: 1 },
    { d: "M30 41h12l-6 6Z", fill: "beak", kind: "path" },
  ];
}
