/**
 * What one thing is worth.
 *
 * "Complete task" is an instruction. "+8 km" is a reward, and the difference
 * between the two is most of why one planner gets opened on a Tuesday evening
 * and another does not.
 *
 * The number is not decoration and it is not a made-up currency: the voyage
 * adds every day's score as kilometres travelled, so the kilometres a task is
 * worth are exactly the score the day gains when it is ticked. Two tasks left
 * and each is worth more; ten tasks left and each is worth less — which is the
 * honest answer, and it is the one that makes finishing the last one feel like
 * something.
 */

import {
  type ProductivityDomain,
  type ProductivityPoint,
  type ProductivityScoring,
  scorePoint,
} from "@/lib/productivity-score";
import type { Task } from "@/lib/tasks";

/** The kilometres a day has scored so far. */
export function dayDistance(
  point: ProductivityPoint,
  domains: ProductivityDomain[],
  scoring?: ProductivityScoring,
) {
  return scorePoint(point, domains, scoring) ?? 0;
}

/**
 * What ticking this task adds to today, in the same kilometres the voyage
 * counts. Never negative: a day cannot go backwards for doing something.
 */
export function getTaskReward(
  point: ProductivityPoint,
  task: Task,
  domains: ProductivityDomain[],
  scoring?: ProductivityScoring,
) {
  const before = dayDistance(point, domains, scoring);
  const after = dayDistance(
    {
      ...point,
      completedTasks: point.completedTasks + 1,
      focusMinutes: point.focusMinutes + Math.max(0, task.estimateMinutes),
      plannedTasks: Math.max(point.plannedTasks, point.completedTasks + 1),
    },
    domains,
    scoring,
  );
  return Math.max(0, after - before);
}

/** What today's training session is worth, asked the same way. */
export function getFitnessReward(
  point: ProductivityPoint,
  domains: ProductivityDomain[],
  scoring?: ProductivityScoring,
) {
  if (!point.plannedFitness || point.completedFitness >= point.plannedFitness) {
    return 0;
  }
  const before = dayDistance(point, domains, scoring);
  const after = dayDistance(
    { ...point, completedFitness: point.plannedFitness },
    domains,
    scoring,
  );
  return Math.max(0, after - before);
}

/** Everything still on the table today. */
export function getRemainingReward(
  point: ProductivityPoint,
  domains: ProductivityDomain[],
  scoring?: ProductivityScoring,
) {
  return Math.max(0, 100 - dayDistance(point, domains, scoring));
}

/** A reward is written the way a gain is written, or it is not written. */
export function formatReward(km: number) {
  return km > 0 ? `+${Math.round(km)} km` : "";
}
