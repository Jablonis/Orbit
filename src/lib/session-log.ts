import type { BlockSessionLogProps } from "@/components/fitness/BlockSessionLog";
import { guideFor } from "@/lib/exercise-catalog";
import { getExercise, getExerciseName } from "@/lib/exercises";
import type { WeekdayId, WeeklyPlanDay } from "@/lib/fitness";
import { bestOneRepMax, bestOneRepMaxFor, formatOneRepMax } from "@/lib/one-rm";
import { restSecondsFor } from "@/lib/rest-timer";
import {
  type ExerciseSet,
  formatLastPerformance,
  getLastPerformance,
  getProgressionTarget,
} from "@/lib/training-block";
import type { ActiveBlock } from "@/lib/training-block-data";

/**
 * Everything the set-logging screen needs, per training day.
 *
 * This used to live inside the Fitness page, which was fine while Fitness was
 * the only place anyone logged a set. The Overview shows today's session too
 * now, and two copies of "what does today's prescription look like" is two
 * places for last time, the estimate and the rest to quietly disagree.
 *
 * Server-side on purpose: it reads the exercise catalogue, which is 900 kB and
 * belongs nowhere near a phone. What it returns is finished strings.
 */
export function buildSessionLogs(
  block: ActiveBlock | null,
  weeklyPlan: WeeklyPlanDay[] | null,
  sets: ExerciseSet[],
): Partial<Record<WeekdayId, BlockSessionLogProps>> {
  const logs: Partial<Record<WeekdayId, BlockSessionLogProps>> = {};
  if (!block || !weeklyPlan) return logs;

  for (const session of block.sessions) {
    const day = weeklyPlan.find((entry) => entry.id === session.weekday);
    if (!day) continue;

    logs[session.weekday] = {
      blockId: block.id,
      exercises: session.exercises.map((exercise) => {
        const logged = sets.filter(
          (set) =>
            set.performedOn === day.date &&
            set.exerciseId === exercise.exerciseId,
        );
        const last = getLastPerformance(sets, exercise.exerciseId, day.date);
        const isCompound = getExercise(exercise.exerciseId)?.isCompound ?? false;

        return {
          exerciseId: exercise.exerciseId,
          guide: guideFor(exercise.exerciseId),
          lastLine: formatLastPerformance(last),
          name: getExerciseName(exercise.exerciseId),
          oneRmLine: formatOneRepMax(
            bestOneRepMax(last?.sets ?? []),
            bestOneRepMaxFor(sets, exercise.exerciseId),
          ),
          repHigh: exercise.repHigh,
          repLow: exercise.repLow,
          restSeconds: restSecondsFor({ isCompound, repHigh: exercise.repHigh }),
          // A row is kept for every set already logged, so a session someone
          // pushed past the prescription still shows all of it.
          sets: Array.from(
            { length: Math.max(exercise.targetSets, logged.length) },
            (_, index) => {
              const row = logged.find((set) => set.setIndex === index + 1);
              return {
                reps: row?.reps ?? null,
                weightKg: row ? row.weightKg : null,
              };
            },
          ),
          targetNote: getProgressionTarget(last, exercise, isCompound).note,
          targetSets: exercise.targetSets,
        };
      }),
      label: session.label,
      weekday: session.weekday,
    };
  }

  return logs;
}
