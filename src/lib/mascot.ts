/**
 * Pip.
 *
 * Orbit needed a face. Not a decoration: a character whose state is the
 * account's state, so a glance at Pip answers "how am I doing" before a single
 * number is read — and so the app has something to send you, put on a card, and
 * be recognised by.
 *
 * Pip is the same rocket the app is about. Everything here is derived; there is
 * no mascot state to store and nothing that can disagree with the numbers.
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
