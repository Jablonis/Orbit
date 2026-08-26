/**
 * One day, read back.
 *
 * The week strip has always known more than it showed: every ring on it is a
 * whole day's numbers reduced to one arc. A ring that can be tapped has to have
 * something to say when it is, and this is that — the same point the strip is
 * drawn from, said in words.
 *
 * Pure, because what a day was is arithmetic, not a query.
 */

import { ORBIT_DAY_SCORE } from "@/lib/momentum";
import type { ProductivityPoint } from "@/lib/productivity-score";

export type DayFigure = { label: string; value: string };

export type DayDetail = {
  figures: DayFigure[];
  /** Whether the day cleared the line that makes it count. */
  inOrbit: boolean;
  note: string;
  score: number | null;
};

export function getDayDetail(
  point: ProductivityPoint,
  today: string,
): DayDetail {
  const future = point.future || point.date > today;
  const score = future ? null : point.score;
  const planned = point.plannedTasks + point.plannedFitness;

  const figures: DayFigure[] = [
    {
      label: "Tasks",
      value: point.plannedTasks
        ? `${point.completedTasks}/${point.plannedTasks}`
        : "None planned",
    },
    {
      label: "Training",
      value: point.plannedFitness
        ? point.completedFitness
          ? "Done"
          : future
            ? "Planned"
            : "Missed"
        : "Rest day",
    },
    {
      label: "Focus",
      value: point.focusMinutes ? `${point.focusMinutes} min` : "—",
    },
  ];

  return {
    figures,
    inOrbit: (score ?? 0) >= ORBIT_DAY_SCORE,
    note: future
      ? point.date === today
        ? "Still going."
        : "Not yet. This day has not happened."
      : planned === 0
        ? "Nothing was planned, so nothing was scored."
        : (score ?? 0) >= ORBIT_DAY_SCORE
          ? "Above the line. This day counted."
          : `${ORBIT_DAY_SCORE - (score ?? 0)} short of the line that makes a day count.`,
    score,
  };
}
