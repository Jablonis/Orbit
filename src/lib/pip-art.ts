/**
 * Pip, as geometry rather than as markup.
 *
 * Pip appears in the interface as SVG and on the shared images as canvas. Two
 * drawings of one character drift apart the first time either is touched, so
 * there is only one: this module returns the shapes, and each renderer knows
 * how to put them on its own surface.
 *
 * The shapes themselves now come from a grid — see `pip-pixels` for why, and
 * for the art. This module stays because it is the contract both renderers were
 * written against: the box, the named colours, and one function that turns a
 * mood into things to paint.
 *
 * Coordinates are in Pip's own 72 × 104 box. Colours are named rather than
 * literal, because the paper cards and the dark share images do not agree on
 * what black is.
 */

import type { PipMood } from "@/lib/mascot";
import { frameToShapes, getPipFrame, getPipPose } from "@/lib/pip-pixels";

export const PIP_WIDTH = 72;
export const PIP_HEIGHT = 104;

export type PipColor = "beak" | "flame" | "ink" | "paper" | "plum";

export type PipRotation = { deg: number; x: number; y: number };

type Common = {
  fill?: PipColor;
  opacity?: number;
  /** A part the renderers animate on its own: "eye", "body". */
  part?: PipPart;
  rotate?: PipRotation;
  stroke?: PipColor;
  width?: number;
};

export type PipPart = "eye" | "flame";

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
  /**
   * Degrees the whole character leans. Zero on a grid: a rotated pixel is a
   * smeared pixel, so the poses carry the lean instead.
   */
  tilt: number;
};

export function isPipStanding(mood: PipMood) {
  return getPipPose(mood) === "stand";
}

/**
 * Every shape Pip is made of, in paint order.
 *
 * `burn` is how much engine shows, 0–1. On the ground it shows none: the flame
 * is what leaving looks like, not what standing looks like. `blink` shuts the
 * eyes of a face that has them, which is how the interface animates one.
 */
export function getPipArt(mood: PipMood, burn = 0.5, blink = false): PipArt {
  return {
    shapes: frameToShapes(
      getPipFrame(mood, Math.max(0, Math.min(1, burn)), blink),
    ),
    tilt: 0,
  };
}
