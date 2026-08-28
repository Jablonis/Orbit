/**
 * The ascent: Orbit's own picture of a day.
 *
 * Three concentric rings are Apple's idea, and a borrowed idea reads as
 * borrowed however well it is drawn. Orbit's mechanic is not laps around a
 * circle — it is altitude: the day either lifts the orbit or lets drag take it,
 * and there is a real line (`ORBIT_DAY_SCORE`) above which the day counted.
 *
 * So the day is drawn as a launch. Three columns of thrust — tasks, fitness,
 * finance — rise from a pad; a dashed line crosses the frame where orbit
 * begins; and the day's own score rides at its height, crossing the line when
 * the day is in.
 *
 * It is wide rather than square, which is also the shape a phone has to spare.
 */

import { ORBIT_DAY_SCORE } from "@/lib/momentum";

export type AscentSystem = "fitness" | "habits" | "tasks";

export type AscentColumn = {
  /** True once this area is done for the day. */
  closed: boolean;
  /** 0–1 of the frame's height. */
  height: number;
  label: string;
  /** Nothing planned here today: drawn as a dormant pad, not as a failure. */
  idle: boolean;
  percent: number;
  system: AscentSystem;
  value: string;
};

export type Ascent = {
  columns: AscentColumn[];
  /** 0–1: where the day itself has reached. */
  altitude: number;
  closed: number;
  /** True when the day is above the line that makes it count. */
  inOrbit: boolean;
  /** 0–1: where the line that makes a day count sits in the frame. */
  orbitLine: number;
  total: number;
};

/** A column never disappears entirely: a pad with nothing on it is still a pad. */
const FLOOR = 0.06;

/** The frame reaches past the orbit line, so crossing it is visible. */
const CEILING_SCORE = 100;

export function getAscent({
  areas,
  todayScore,
}: {
  areas: Array<{
    completed: number;
    label: string;
    percent: number;
    system: AscentSystem;
    total: number;
  }>;
  todayScore: number | null;
}): Ascent {
  const columns = areas.map<AscentColumn>((area) => {
    const percent = Math.max(0, Math.min(100, area.percent));
    return {
      closed: area.total > 0 && percent >= 100,
      height: area.total === 0 ? FLOOR : Math.max(FLOOR, percent / 100),
      idle: area.total === 0,
      label: area.label,
      percent,
      system: area.system,
      value:
        area.total === 0 ? "—" : `${area.completed}/${area.total}`,
    };
  });

  const active = columns.filter((column) => !column.idle);

  return {
    altitude: Math.max(
      0,
      Math.min(1, (todayScore ?? 0) / CEILING_SCORE),
    ),
    closed: active.filter((column) => column.closed).length,
    columns,
    inOrbit: (todayScore ?? 0) >= ORBIT_DAY_SCORE,
    orbitLine: ORBIT_DAY_SCORE / CEILING_SCORE,
    total: active.length,
  };
}

/** The line under the picture, in the app's own words. */
export function getAscentLine(ascent: Ascent) {
  if (ascent.total === 0) return "Nothing is planned yet today.";
  if (ascent.closed === ascent.total) return "Every stage is done.";
  if (ascent.inOrbit) {
    return `In orbit — ${ascent.closed} of ${ascent.total} stages done.`;
  }
  return `${ascent.closed} of ${ascent.total} stages done, below the line.`;
}
