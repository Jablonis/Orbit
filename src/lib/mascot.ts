/**
 * Pip.
 *
 * Orbit needed a face. Not a decoration: a character whose state is the
 * account's state, so a glance at Pip answers "how am I doing" before a single
 * number is read — and so the app has something to send you, put on a card, and
 * be recognised by.
 *
 * Pip is a penguin: the bird that cannot fly, in the one place flying is the
 * whole point. Everything here is derived; there is no mascot state to store
 * and nothing that can disagree with the numbers.
 */

import { MOMENTUM_DECAY } from "@/lib/momentum";

export const pipMoods = [
  "asleep",
  "grounded",
  "lifting",
  "cruising",
  "soaring",
  "sealed",
] as const;

export type PipMood = (typeof pipMoods)[number];

export type PipState = {
  /** How hard the engine is burning, 0–1. Drives the flame and the tilt. */
  burn: number;
  line: string;
  mood: PipMood;
};

/**
 * Pip's mood, in the order that matters: a finished day beats everything, then
 * how the day is going, then where the orbit already is.
 */
export function getPipState({
  allClosed,
  altitude,
  streak,
  todayScore,
}: {
  allClosed: boolean;
  altitude: number;
  streak: number;
  todayScore: number | null;
}): PipState {
  const score = todayScore ?? 0;

  if (allClosed) {
    return {
      burn: 1,
      line:
        streak > 1
          ? `Every ring closed. ${streak} days and counting.`
          : "Every ring closed. That is the whole day.",
      mood: "sealed",
    };
  }

  if (score >= 80) {
    return { burn: 0.9, line: "Full burn. Nothing to add.", mood: "soaring" };
  }
  if (score >= 50) {
    return {
      burn: 0.7,
      line: "Holding altitude. The day already counts.",
      mood: "cruising",
    };
  }
  if (score > 0) {
    return {
      burn: 0.45,
      line: "Engine is lit. One more thing and the day holds.",
      mood: "lifting",
    };
  }
  if (altitude >= 40) {
    return {
      burn: 0.2,
      line: "Coasting on yesterday. Drag wins if today stays empty.",
      mood: "grounded",
    };
  }

  return {
    burn: 0.1,
    line: "On the pad. One honest hour starts the climb.",
    mood: "asleep",
  };
}

/**
 * Pip's mood for a finished week, for the recap and its shared image. A week
 * is judged on days held, not on an average — the same rule as the recap.
 */
export function getWeekPipMood({
  daysInOrbit,
  isBestWeek,
}: {
  daysInOrbit: number;
  isBestWeek: boolean;
}): PipMood {
  if (daysInOrbit === 7 || isBestWeek) return "sealed";
  if (daysInOrbit >= 5) return "soaring";
  if (daysInOrbit >= 3) return "cruising";
  if (daysInOrbit > 0) return "lifting";
  return "asleep";
}

export type Climb = {
  /** What today did to the orbit, as a multiplier: 1.24 means a quarter up. */
  multiplier: number;
  /** Where the rocket tops out, 0–1, for the curve to be drawn against. */
  peak: number;
  /** True while the day is still adding to the orbit rather than draining it. */
  rising: boolean;
  to: number;
  from: number;
};

export type PanelPip = {
  burn: number;
  mood: PipMood;
  /** What Pip is reacting to, for anyone who cannot see him. */
  title: string;
};

/**
 * A panel's own Pip.
 *
 * The dashboard's Pip reads the whole day. A card only knows its own corner of
 * it — how many tasks, how much of the training, how many milestones — so it
 * gets the same ladder read from those two numbers instead. Same rule
 * everywhere, so a penguin on the fitness card and a penguin on the tasks card
 * mean the same thing by the same face.
 *
 * Derived, like every other Pip: nothing here can be chosen, and a card with
 * nothing asked of it gets a penguin standing still rather than a cheerful one.
 */
export function getPanelPip(
  done: number,
  total: number,
  subject = "this",
): PanelPip {
  const complete = Math.max(0, done);
  const asked = Math.max(0, total);

  if (asked === 0) {
    return { burn: 0.15, mood: "grounded", title: `Nothing planned in ${subject}.` };
  }

  const ratio = Math.min(1, complete / asked);
  const said = `${complete} of ${asked} in ${subject}.`;

  if (complete >= asked) return { burn: 1, mood: "sealed", title: said };
  if (ratio >= 0.8) return { burn: 0.9, mood: "soaring", title: said };
  if (ratio >= 0.5) return { burn: 0.7, mood: "cruising", title: said };
  if (ratio > 0) return { burn: 0.45, mood: "lifting", title: said };
  return { burn: 0.2, mood: "grounded", title: said };
}

/** The lowest a day can multiply an orbit: doing nothing at all. */
export const CLIMB_FLOOR = MOMENTUM_DECAY;

/**
 * Today as a climb.
 *
 * The multiplier is the real one — what the orbit is now over what it was
 * yesterday — not a number invented to look exciting. A day with nothing on it
 * lands at 0.85, because that is exactly what decay does to it.
 */
export function getClimb(from: number, to: number): Climb {
  const base = Math.max(0, from);
  const target = Math.max(0, to);
  const multiplier = base === 0 ? (target > 0 ? 2 : 1) : target / base;

  return {
    from: Math.round(base),
    multiplier: Math.round(multiplier * 100) / 100,
    // A climb reads against the possible range, so a 0.85 day visibly sinks and
    // a doubling visibly leaves the frame.
    peak: Math.max(0.04, Math.min(1, (multiplier - CLIMB_FLOOR) / (2 - CLIMB_FLOOR))),
    rising: target > base,
    to: Math.round(target),
  };
}

/** The multiplier as it is printed: always two decimals, always signed by ×. */
export function formatMultiplier(multiplier: number) {
  return `×${multiplier.toFixed(2)}`;
}
