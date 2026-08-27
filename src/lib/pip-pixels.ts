/**
 * Pip, drawn on a grid.
 *
 * The vector Pip was a good mark and a dull creature: smooth curves, one pose,
 * and every mood a small change of tilt. Pixels are the opposite trade — the
 * shapes are crude, and because a pixel character is *read* rather than
 * inspected, a two-pixel change of an eyebrow is a whole change of mood. It is
 * also the idiom people already know from games, which is the register the rest
 * of Orbit's rewards are written in.
 *
 * The grid is 18 × 26 at four units a cell, which is exactly the 72 × 104 box
 * the vector Pip used, so every place that already draws him keeps its layout.
 *
 * Each frame is composed rather than drawn whole: a head that carries the face,
 * a body that carries the pose, and a flame sized by the engine. Three heads
 * and three bodies are nine drawings from twenty-six lines of art, and every
 * combination stays in register because they share the grid.
 */

import type { PipMood } from "@/lib/mascot";
import type { PipColor, PipShape } from "@/lib/pip-art";

export const PIXEL = 4;
export const GRID_WIDTH = 18;
export const GRID_HEIGHT = 26;

/**
 * What each character paints. Glass is plum you can see through, so the head
 * reads as being inside the helmet rather than behind it.
 */
const INK: Record<string, { fill: PipColor; opacity?: number }> = {
  B: { fill: "beak" },
  E: { fill: "ink" },
  F: { fill: "flame" },
  G: { fill: "plum", opacity: 0.16 },
  H: { fill: "paper", opacity: 0.75 },
  K: { fill: "ink" },
  O: { fill: "beak", opacity: 0.85 },
  P: { fill: "plum" },
  W: { fill: "paper" },
};

/** Eyes open, the everyday face. */
const HEAD_OPEN = [
  "..................",
  "......PPPPPP......",
  "....PPGGGGGGPP....",
  "...PGGHHGGGGGGP...",
  "..PGGHKKKKKKGGGP..",
  "..PGGKKKKKKKKGGP..",
  ".PGGKKWWWWWWKKGGP.",
  ".PGKKWWWWWWWWKKGP.",
  ".PGKWWEEWWEEWWKGP.",
  ".PGKWWEEWWEEWWKGP.",
  ".PGKWWWWBBWWWWKGP.",
  "..PGKWWWBBWWWKGP..",
  "..PPGKKWWWWKKGPP..",
  "...PPPPPPPPPPPP...",
];

/** Shut: blinking, and asleep. */
const HEAD_SHUT = [
  "..................",
  "......PPPPPP......",
  "....PPGGGGGGPP....",
  "...PGGHHGGGGGGP...",
  "..PGGHKKKKKKGGGP..",
  "..PGGKKKKKKKKGGP..",
  ".PGGKKWWWWWWKKGGP.",
  ".PGKKWWWWWWWWKKGP.",
  ".PGKWWWWWWWWWWKGP.",
  ".PGKWEEEWWEEEWKGP.",
  ".PGKWWWWBBWWWWKGP.",
  "..PGKWWWBBWWWKGP..",
  "..PPGKKWWWWKKGPP..",
  "...PPPPPPPPPPPP...",
];

/** Delighted: the eyes arch and the beak opens. */
const HEAD_HAPPY = [
  "..................",
  "......PPPPPP......",
  "....PPGGGGGGPP....",
  "...PGGHHGGGGGGP...",
  "..PGGHKKKKKKGGGP..",
  "..PGGKKKKKKKKGGP..",
  ".PGGKKWWWWWWKKGGP.",
  ".PGKKWWWWWWWWKKGP.",
  ".PGKWWEWWWWEWWKGP.",
  ".PGKWEWEWWEWEWKGP.",
  ".PGKWWWBBBBWWWKGP.",
  "..PGKWWWBBWWWKGP..",
  "..PPGKKWWWWKKGPP..",
  "...PPPPPPPPPPPP...",
];

/** Feet down, flippers at rest. Nothing is being asked of the engine. */
const BODY_STAND = [
  "....KKWWWWWWKK....",
  "..KKKKWWWWWWKKKK..",
  "..KKKKWWWWWWKKKK..",
  "..KKKKWWWWWWKKKK..",
  "...KKKWWWWWWKKK...",
  "....KKWWWWWWKK....",
  "....KKKWWWWKKK....",
  ".....KKKKKKKK.....",
  "......BB..BB......",
  ".....BBB..BBB.....",
  "..................",
  "..................",
];

/** In flight: feet tucked into the pack, flippers swept back. */
const BODY_FLY = [
  "....KKWWWWWWKK....",
  "...KKKWWWWWWKKK...",
  "..KKKKWWWWWWKKKK..",
  "..KKKKWWWWWWKKKK..",
  "...KKKWWWWWWKKK...",
  ".....KKKWWKKK.....",
  ".....PPPPPPPP.....",
  "......PPPPPP......",
  "..................",
  "..................",
  "..................",
  "..................",
];

/** Both flippers up: reserved for a day that is actually finished. */
const BODY_CHEER = [
  "KK..KKWWWWWWKK..KK",
  "KKK.KKWWWWWWKK.KKK",
  ".KKKKKWWWWWWKKKKK.",
  "..KKKKWWWWWWKKKK..",
  "...KKKWWWWWWKKK...",
  ".....KKKWWKKK.....",
  ".....PPPPPPPP.....",
  "......PPPPPP......",
  "..................",
  "..................",
  "..................",
  "..................",
];

/** Three lengths of thrust, drawn from the pack down. */
const FLAMES = [
  ["......OOOO........", ".......OO........."],
  ["......OOOO........", "......OFFO........", ".......OO........."],
  [
    ".....OOOOOO.......",
    ".....OFFFFO.......",
    "......OFFO........",
    ".......OO.........",
  ],
];

export type PipPose = "cheer" | "fly" | "stand";
export type PipFace = "happy" | "open" | "shut";

const pose: Record<PipMood, PipPose> = {
  asleep: "stand",
  cruising: "fly",
  grounded: "stand",
  lifting: "fly",
  sealed: "cheer",
  soaring: "fly",
};

const face: Record<PipMood, PipFace> = {
  asleep: "shut",
  cruising: "open",
  grounded: "open",
  lifting: "open",
  sealed: "happy",
  soaring: "happy",
};

const heads: Record<PipFace, string[]> = {
  happy: HEAD_HAPPY,
  open: HEAD_OPEN,
  shut: HEAD_SHUT,
};

const bodies: Record<PipPose, string[]> = {
  cheer: BODY_CHEER,
  fly: BODY_FLY,
  stand: BODY_STAND,
};

export function getPipPose(mood: PipMood) {
  return pose[mood];
}

export function getPipFace(mood: PipMood) {
  return face[mood];
}

/**
 * One frame as a grid of characters, ready to be painted.
 *
 * `blink` shuts the eyes of a face that has them; a mood that is already
 * asleep or delighted keeps its own.
 */
export function getPipFrame(
  mood: PipMood,
  burn = 0.5,
  blink = false,
): string[] {
  const shownFace = blink && face[mood] === "open" ? "shut" : face[mood];
  const rows = [...heads[shownFace], ...bodies[pose[mood]]];

  if (pose[mood] === "stand") return rows;

  // The flame starts where the pack ends, so a longer one reaches further down
  // the grid rather than growing out of the middle of the body.
  const flame = FLAMES[burn >= 0.75 ? 2 : burn >= 0.4 ? 1 : 0];
  const top = 22;
  return rows.map((row, index) => {
    const line = flame[index - top];
    if (!line) return row;
    // Painted under whatever the body already put there.
    return row
      .split("")
      .map((cell, column) => (cell === "." ? line[column] : cell))
      .join("");
  });
}

/**
 * A frame as rectangles, merging each run of one colour into a single shape.
 *
 * A naive cell-per-rect frame is 250 nodes; merged it is nearer 80, which
 * matters when six Pips share a dashboard.
 */
export function frameToShapes(rows: string[]): PipShape[] {
  const shapes: PipShape[] = [];

  rows.forEach((row, y) => {
    let start = -1;
    let current = ".";

    const flush = (end: number) => {
      const paint = INK[current];
      if (start >= 0 && paint) {
        shapes.push({
          fill: paint.fill,
          height: PIXEL,
          kind: "rect",
          opacity: paint.opacity,
          part:
            current === "E"
              ? "eye"
              : current === "F" || current === "O"
                ? "flame"
                : undefined,
          radius: 0,
          width: (end - start) * PIXEL,
          x: start * PIXEL,
          y: y * PIXEL,
        });
      }
      start = -1;
      current = ".";
    };

    for (let x = 0; x < row.length; x += 1) {
      const cell = row[x];
      if (cell !== current) {
        flush(x);
        if (cell !== ".") {
          current = cell;
          start = x;
        }
      }
    }
    flush(row.length);
  });

  return shapes;
}
