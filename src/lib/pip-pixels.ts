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
  M: { fill: "ink" },
  O: { fill: "beak", opacity: 0.85 },
  P: { fill: "plum" },
  S: { fill: "plum" },
  W: { fill: "paper" },
  Y: { fill: "paper" },
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

/**
 * Downcast: the brows fall outward and the eyes drop.
 *
 * Two pixels, and it is a different creature. This is the whole argument for
 * the grid — the vector Pip could only ever lean, so nothing asked of you and
 * nothing done about it wore the same face as a day going fine.
 */
const HEAD_SAD = [
  "..................",
  "......PPPPPP......",
  "....PPGGGGGGPP....",
  "...PGGHHGGGGGGP...",
  "..PGGHKKKKKKGGGP..",
  "..PGGKKKKKKKKGGP..",
  ".PGGKKWWWWWWKKGGP.",
  ".PGKKWWWWWWWWKKGP.",
  ".PGKWEWWWWWWEWKGP.",
  ".PGKWWEEWWEEWWKGP.",
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
export type PipFace = "happy" | "open" | "sad" | "shut";

/**
 * What Pip is carrying.
 *
 * A penguin who looks identical on every panel is a sticker. Give him the tool
 * of the thing he is standing next to and each panel gets a character rather
 * than a repeated logo — and the tool says which panel it is faster than the
 * label above it does.
 */
export type PipProp = "book" | "dumbbell" | "none" | "notes" | "racket";

export type PipKit = {
  /** Reading glasses, inside the helmet. */
  glasses: boolean;
  prop: PipProp;
};

export const BARE_KIT: PipKit = { glasses: false, prop: "none" };

/**
 * Reading glasses: two posts, a bridge, and a rim under each eye.
 *
 * Drawn in plum rather than ink, and as two rings with the eye as the pupil
 * inside. The face is only ten white cells across and the eyes take four of
 * them: an ink frame fills what is left and the whole head reads as one black
 * band — a bandit's mask, not spectacles. Colour is what separates the frame
 * from the eye at this size, not space, because there is no space.
 */
const GLASSES: Overlay = {
  rows: [
    ".....SSSSSSSS.....",
    ".....S..SS..S.....",
    ".....S..SS..S.....",
    ".....SSS..SSS.....",
  ],
  top: 7,
};

type Overlay = { rows: string[]; top: number };

/**
 * Held things, drawn into the margin beside the body.
 *
 * They live in columns the poses leave empty on purpose: a prop that overwrote
 * a flipper would read as an amputation at 28 pixels tall. Left hand carries
 * paper, right hand carries metal.
 */
const PROPS: Record<Exclude<PipProp, "none">, Overlay> = {
  // Plum covers, white pages. Paper needs an edge of its own or it disappears
  // into the card behind it, which is how the first notebook came out invisible.
  book: {
    rows: [
      "PPPP..............",
      "PYYP..............",
      "PPYP..............",
      "PYYP..............",
      "PPPP..............",
    ],
    top: 19,
  },
  dumbbell: {
    rows: [
      "..............MMM.",
      "..............MMM.",
      "...............M..",
      "...............M..",
      "..............MMM.",
      "..............MMM.",
    ],
    top: 19,
  },
  notes: {
    rows: [
      "MMMM..............",
      "MYYM..............",
      "MMYM..............",
      "MYYM..............",
      "MMMM..............",
    ],
    top: 19,
  },
  racket: {
    rows: [
      "..............MMMM",
      "..............M..M",
      "..............M..M",
      "..............MMMM",
      "...............M..",
      "...............M..",
    ],
    top: 19,
  },
};

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
  // Something was asked and none of it is done. That is not neutral.
  grounded: "sad",
  lifting: "open",
  sealed: "happy",
  soaring: "happy",
};

const heads: Record<PipFace, string[]> = {
  happy: HEAD_HAPPY,
  open: HEAD_OPEN,
  sad: HEAD_SAD,
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

/** Whether this mood has eyes to shut. A shut or delighted face has none. */
export function pipBlinks(mood: PipMood) {
  return face[mood] === "open" || face[mood] === "sad";
}

/** Paints an overlay over whatever the frame already had in those cells. */
function paint(rows: string[], overlay: Overlay) {
  return rows.map((row, index) => {
    const line = overlay.rows[index - overlay.top];
    if (!line) return row;
    return row
      .split("")
      .map((cell, column) => (line[column] === "." ? cell : line[column]))
      .join("");
  });
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
  kit: PipKit = BARE_KIT,
): string[] {
  const shownFace = blink && pipBlinks(mood) ? "shut" : face[mood];
  let rows = [...heads[shownFace], ...bodies[pose[mood]]];

  if (kit.glasses) rows = paint(rows, GLASSES);
  if (kit.prop !== "none") rows = paint(rows, PROPS[kit.prop]);

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
