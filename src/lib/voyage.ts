/**
 * The voyage.
 *
 * Orbit had one number, and it was a decaying one: altitude tells you how you
 * are flying today and takes 15 % of itself every day you do nothing. That
 * creates pressure, which is half of a habit — and on its own it reads as
 * punishment, because there is nothing to keep.
 *
 * So there is a second number with the opposite job. Distance is the sum of
 * every day Orbit has scored, and it **never goes down**. A day off adds
 * nothing; it does not take anything back. You cannot un-visit the Moon.
 *
 * Altitude is how you are flying. Distance is how far you have come. The first
 * is the pressure; the second is the reward, and the reason to look back.
 *
 * Everything here is derived from the same daily scores the dashboard already
 * computes — including the date each place was reached, which falls out of
 * walking the days in order. There is no voyage table to drift.
 */

import type { ProductivityPoint } from "@/lib/productivity-score";

export type VoyageLeg = {
  /** What the place is, in one line worth reading twice. */
  blurb: string;
  distance: number;
  id: string;
  name: string;
};

/**
 * The map. Distances are paced for a human year rather than drawn to scale —
 * a real Mars transfer would take a lifetime of perfect days, and a ladder
 * nobody can climb is not a ladder. The names and the facts are real.
 */
export const VOYAGE_LEGS: VoyageLeg[] = [
  {
    blurb: "Where every voyage starts, and the only place with a view of home.",
    distance: 0,
    id: "pad",
    name: "The pad",
  },
  {
    blurb: "A hundred kilometres up, the air gives up and space begins.",
    distance: 400,
    id: "karman",
    name: "The Kármán line",
  },
  {
    blurb: "Fast enough to keep falling and never land.",
    distance: 1200,
    id: "low-orbit",
    name: "Low orbit",
  },
  {
    blurb: "Turning exactly as fast as the day does, so it never sets.",
    distance: 3000,
    id: "geostationary",
    name: "Geostationary",
  },
  {
    blurb: "The first place anyone stood that was not home.",
    distance: 7000,
    id: "moon",
    name: "The Moon",
  },
  {
    blurb: "Two years of planning for seven minutes of landing.",
    distance: 15000,
    id: "mars",
    name: "Mars",
  },
  {
    blurb: "Rubble that never quite became a planet.",
    distance: 26000,
    id: "belt",
    name: "The belt",
  },
  {
    blurb: "A storm wider than Earth, older than every calendar we have.",
    distance: 42000,
    id: "jupiter",
    name: "Jupiter",
  },
  {
    blurb: "Rings you can find with a telescope from a garden.",
    distance: 65000,
    id: "saturn",
    name: "Saturn",
  },
  {
    blurb: "Where the sun stops pushing back. Nobody has ever come home.",
    distance: 100000,
    id: "heliopause",
    name: "The heliopause",
  },
];

export type Arrival = {
  /** The day the distance first passed this leg. */
  date: string;
  leg: VoyageLeg;
};

export type Voyage = {
  arrivals: Arrival[];
  /** The first day Orbit ever scored for this account, if there is one. */
  startedOn: string | null;
  /** The furthest place reached. Always at least the pad. */
  current: VoyageLeg;
  distance: number;
  /** Days at the current pace until the next place, null when it cannot be told. */
  etaDays: number | null;
  next: VoyageLeg | null;
  /** Distance per day over the last seven days. */
  pace: number;
  /** 0–1 of the way from the current leg to the next. */
  progress: number;
  /** How far the next place still is. */
  toNext: number;
};

const PACE_WINDOW = 7;

/**
 * The whole voyage from a run of scored days, oldest first.
 *
 * Only days that actually scored something count; a day with no score yet is
 * not a day of zero, it is a day that has not happened.
 */
export function getVoyage(points: ProductivityPoint[]): Voyage {
  const days = points.filter((point) => !point.future && point.score !== null);

  let distance = 0;
  let reached = 0;
  const arrivals: Arrival[] = [];

  for (const day of days) {
    distance += Math.max(0, day.score ?? 0);

    // Walk the ladder rather than search it: a single day can pass more than
    // one place, and each of them arrived on that day.
    while (
      reached + 1 < VOYAGE_LEGS.length &&
      distance >= VOYAGE_LEGS[reached + 1].distance
    ) {
      reached += 1;
      arrivals.push({ date: day.date, leg: VOYAGE_LEGS[reached] });
    }
  }

  const current = VOYAGE_LEGS[reached];
  const next = VOYAGE_LEGS[reached + 1] ?? null;
  const recent = days.slice(-PACE_WINDOW);
  const pace = recent.length
    ? recent.reduce((total, day) => total + Math.max(0, day.score ?? 0), 0) /
      recent.length
    : 0;
  const toNext = next ? Math.max(0, next.distance - distance) : 0;

  return {
    arrivals,
    startedOn: days[0]?.date ?? null,
    current,
    distance: Math.round(distance),
    etaDays: next && pace > 0 ? Math.max(1, Math.ceil(toNext / pace)) : null,
    next,
    pace: Math.round(pace),
    progress: next
      ? Math.min(
          1,
          Math.max(
            0,
            (distance - current.distance) / (next.distance - current.distance),
          ),
        )
      : 1,
    toNext: Math.round(toNext),
  };
}

/**
 * The line that makes the distance mean something. A countdown to a named
 * place moves people; a running total does not.
 */
export function getVoyageLine(voyage: Voyage) {
  if (!voyage.next) {
    return "Past the last map anyone drew. Everything from here is new.";
  }
  if (voyage.distance === 0) {
    return `On the pad. ${voyage.next.name} is ${format(voyage.next.distance)} out.`;
  }
  if (voyage.etaDays === null) {
    return `${format(voyage.toNext)} to ${voyage.next.name}.`;
  }
  if (voyage.etaDays === 1) {
    return `${voyage.next.name} tomorrow, if today looks like the last seven.`;
  }
  return `${voyage.next.name} in ${voyage.etaDays} days at this pace.`;
}

/** Distances are read, not calculated: 12 400 rather than 12400. */
export function format(distance: number) {
  return `${Math.round(distance).toLocaleString("en-GB").replace(/,/g, " ")} km`;
}

/** Whole days from one date to another, both ends counted. */
export function daysOut(from: string | null, to: string) {
  if (!from) return 1;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}
