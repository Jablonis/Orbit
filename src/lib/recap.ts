/**
 * Weekly recap.
 *
 * The day card answers "how was today". Nobody posts that every day. A week is
 * the unit people actually talk about — Strava's Monday summary, Spotify's
 * year — so on the first days of a new week Orbit closes the old one: what the
 * seven days added up to, how it compares to the week before, and one image
 * worth sending to somebody.
 *
 * Everything here is derived from the productivity points the Overview already
 * loads. No recap table, nothing to regenerate, nothing to fall out of sync.
 */

import { getAltitudeSeries, ORBIT_DAY_SCORE, getOrbitTier } from "@/lib/momentum";
import { getWeekPipMood } from "@/lib/mascot";
import type { PipMood } from "@/lib/mascot";
import type { OrbitTier } from "@/lib/momentum";
import type { ProductivityPoint } from "@/lib/productivity-score";

/** How long a finished week stays worth showing before it is just history. */
export const RECAP_FRESH_DAYS = 3;

export type RecapDay = {
  date: string;
  inOrbit: boolean;
  label: string;
  score: number;
};

export type RecapStat = {
  label: string;
  value: string;
};

export type WeekRecap = {
  altitudeChange: number;
  altitudeEnd: number;
  altitudeStart: number;
  bestDay: RecapDay | null;
  days: RecapDay[];
  daysInOrbit: number;
  focusMinutes: number;
  /** True while the week just ended; the recap is a moment, not a permanent card. */
  fresh: boolean;
  headline: string;
  isBestWeek: boolean;
  label: string;
  /** How Pip stands on the recap and on its shared image. */
  mood: PipMood;
  previousDaysInOrbit: number;
  previousScore: number;
  score: number;
  scoreDelta: number;
  sessions: number;
  stats: RecapStat[];
  tasks: number;
  tier: OrbitTier;
  verdict: string;
  weekEnd: string;
  weekStart: string;
};

/**
 * The last week that is actually over, and whether it only just ended.
 *
 * `today` is already the account's local date, so this is pure string maths.
 */
export function getRecapWeek(
  today: string,
  weekStartsOn: "monday" | "sunday" = "monday",
): { fresh: boolean; weekEnd: string; weekStart: string } {
  const date = new Date(`${today}T12:00:00Z`);
  const firstDay = weekStartsOn === "sunday" ? 0 : 1;
  const intoWeek = (date.getUTCDay() - firstDay + 7) % 7;

  return {
    fresh: intoWeek < RECAP_FRESH_DAYS,
    weekEnd: shift(today, -intoWeek - 1),
    weekStart: shift(today, -intoWeek - 7),
  };
}

/**
 * Builds the recap for one finished week out of a longer run of points.
 *
 * The points must cover at least the fortnight ending on `weekEnd`; the
 * Overview already loads thirty days, so nothing extra is fetched.
 */
export function getWeekRecap({
  fresh,
  locale = "en-GB",
  points,
  weekEnd,
  weekStart,
}: {
  fresh: boolean;
  locale?: string;
  points: ProductivityPoint[];
  weekEnd: string;
  weekStart: string;
}): WeekRecap | null {
  const week = points.filter(
    (point) => point.date >= weekStart && point.date <= weekEnd,
  );
  if (week.length < 7) return null;

  const previousStart = shift(weekStart, -7);
  const previous = points.filter(
    (point) => point.date >= previousStart && point.date < weekStart,
  );

  const days: RecapDay[] = week.map((point) => ({
    date: point.date,
    inOrbit: (point.score ?? 0) >= ORBIT_DAY_SCORE,
    label: point.label,
    score: point.score ?? 0,
  }));

  const score = average(week);
  const previousScore = average(previous);
  const daysInOrbit = days.filter((day) => day.inOrbit).length;
  const previousDaysInOrbit = previous.filter(
    (point) => (point.score ?? 0) >= ORBIT_DAY_SCORE,
  ).length;
  const bestDay = days.reduce<RecapDay | null>(
    (best, day) => (best === null || day.score > best.score ? day : best),
    null,
  );

  const series = getAltitudeSeries(points);
  const altitudeStart = altitudeAt(series, shift(weekStart, -1));
  const altitudeEnd = altitudeAt(series, weekEnd);
  const altitudeChange = altitudeEnd - altitudeStart;

  const best = isBestWeek(points, weekStart, weekEnd, score);
  const tasks = week.reduce((total, point) => total + point.completedTasks, 0);
  const sessions = week.reduce(
    (total, point) => total + point.completedFitness,
    0,
  );
  const focusMinutes = week.reduce(
    (total, point) => total + point.focusMinutes,
    0,
  );

  return {
    altitudeChange,
    altitudeEnd,
    altitudeStart,
    bestDay: bestDay && bestDay.score > 0 ? bestDay : null,
    days,
    daysInOrbit,
    focusMinutes,
    fresh,
    headline: getHeadline(daysInOrbit, score),
    isBestWeek: best,
    label: formatWeekLabel(weekStart, weekEnd, locale),
    mood: getWeekPipMood({ daysInOrbit, isBestWeek: best }),
    previousDaysInOrbit,
    previousScore,
    score,
    scoreDelta: score - previousScore,
    sessions,
    stats: [
      { label: "In orbit", value: `${daysInOrbit}/7` },
      { label: "Tasks", value: `${tasks}` },
      { label: "Altitude", value: `${altitudeEnd}` },
    ],
    tasks,
    tier: getOrbitTier(altitudeEnd),
    verdict: getVerdict({
      daysInOrbit,
      previousDaysInOrbit,
      previousScore,
      score,
    }),
    weekEnd,
    weekStart,
  };
}

/** The line that opens the recap. Days carry further than percentages. */
function getHeadline(daysInOrbit: number, score: number) {
  if (daysInOrbit === 7) return "A perfect week.";
  if (daysInOrbit === 6) return "Six of seven.";
  if (daysInOrbit >= 4) return `${daysInOrbit} days in orbit.`;
  if (daysInOrbit > 0) return `${daysInOrbit} day${daysInOrbit === 1 ? "" : "s"} held.`;
  if (score > 0) return "The orbit decayed.";
  return "A week off the board.";
}

/** The comparison. Nobody needs both numbers if one of them says it. */
function getVerdict({
  daysInOrbit,
  previousDaysInOrbit,
  previousScore,
  score,
}: {
  daysInOrbit: number;
  previousDaysInOrbit: number;
  previousScore: number;
  score: number;
}) {
  if (previousScore === 0 && score === 0) {
    return "Nothing logged either week. One day starts it.";
  }
  if (previousScore === 0) return "Your first week on the board.";

  const delta = score - previousScore;
  const days = daysInOrbit - previousDaysInOrbit;

  if (delta >= 8) return `Up ${delta} points on last week.`;
  if (delta <= -8) return `Down ${Math.abs(delta)} points on last week.`;
  if (days > 0) return `${days} more day${days === 1 ? "" : "s"} in orbit than last week.`;
  if (days < 0) {
    return `${Math.abs(days)} fewer day${days === -1 ? "" : "s"} in orbit than last week.`;
  }
  return "Level with last week.";
}

/** Best of every whole week inside the loaded window, this one included. */
function isBestWeek(
  points: ProductivityPoint[],
  weekStart: string,
  weekEnd: string,
  score: number,
) {
  if (score === 0) return false;

  for (let offset = 7; offset <= 21; offset += 7) {
    const start = shift(weekStart, -offset);
    const end = shift(weekEnd, -offset);
    const week = points.filter(
      (point) => point.date >= start && point.date <= end,
    );
    if (week.length === 7 && average(week) >= score) return false;
  }
  return true;
}

function average(points: ProductivityPoint[]) {
  const scores = points.flatMap((point) =>
    point.score === null ? [] : [point.score],
  );
  if (scores.length === 0) return 0;
  return Math.round(
    scores.reduce((total, value) => total + value, 0) / scores.length,
  );
}

function altitudeAt(
  series: Array<{ altitude: number; date: string }>,
  date: string,
) {
  const exact = series.find((point) => point.date === date);
  if (exact) return Math.round(exact.altitude);

  const before = series.filter((point) => point.date < date);
  const last = before[before.length - 1];
  return last ? Math.round(last.altitude) : 0;
}

export function formatWeekLabel(
  weekStart: string,
  weekEnd: string,
  locale: string,
) {
  const day = (date: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(
      new Date(`${date}T12:00:00Z`),
    );
  const month = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));

  const sameMonth = weekStart.slice(0, 7) === weekEnd.slice(0, 7);
  return sameMonth
    ? `${day(weekStart)}–${day(weekEnd)} ${month(weekEnd)}`
    : `${day(weekStart)} ${month(weekStart)} – ${day(weekEnd)} ${month(weekEnd)}`;
}

function shift(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
