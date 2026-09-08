import type { ExerciseSet } from "@/lib/training-block";

/**
 * One rep max, estimated.
 *
 * The problem this solves is that a set is two numbers and progress is one.
 * 8 × 60 kg and 5 × 70 kg are the same effort to within a rounding error, and
 * without something that collapses them into a single figure there is no
 * honest way to say which week was stronger — which is the whole question a
 * six-week block exists to answer.
 *
 * Epley: `w × (1 + reps / 30)`. Chosen over Brzycki because it does not fall
 * apart at the top of the rep range, and because one formula everywhere beats
 * a better one applied inconsistently.
 *
 * Everything here is an estimate and is labelled as one on screen. Orbit does
 * not tell anyone to go and lift it.
 */

/**
 * Past this the formula is fiction: at twenty reps it is measuring how long
 * someone can keep going, not what they could lift once. A high-rep set gets
 * no estimate rather than a confident wrong one.
 */
export const ONE_RM_REP_LIMIT = 12;

/** The estimate in kilograms, or null when the set cannot support one. */
export function estimateOneRepMax(reps: number, weightKg: number): number | null {
  if (!Number.isFinite(reps) || !Number.isFinite(weightKg)) return null;
  if (reps < 1 || reps > ONE_RM_REP_LIMIT) return null;
  // A bodyweight set has no load to extrapolate from. The reps are the record.
  if (weightKg <= 0) return null;
  // A single is not an estimate. Epley extrapolates from one rep to 3% above
  // the bar that was actually lifted, which is a worse answer than the truth.
  if (reps === 1) return round(weightKg);
  return round(weightKg * (1 + reps / 30));
}

export type OneRepMax = {
  performedOn: string;
  reps: number;
  /** Kilograms, to one decimal. */
  value: number;
  weightKg: number;
};

/** The best estimate among some sets — the strongest single effort in them. */
export function bestOneRepMax(
  sets: Array<{ performedOn?: string; reps: number; weightKg: number }>,
): OneRepMax | null {
  let best: OneRepMax | null = null;
  for (const set of sets) {
    const value = estimateOneRepMax(set.reps, set.weightKg);
    if (value === null) continue;
    if (!best || value > best.value) {
      best = {
        performedOn: set.performedOn ?? "",
        reps: set.reps,
        value,
        weightKg: set.weightKg,
      };
    }
  }
  return best;
}

/** The best this exercise has ever shown, across everything loaded. */
export function bestOneRepMaxFor(
  sets: ExerciseSet[],
  exerciseId: string,
): OneRepMax | null {
  return bestOneRepMax(sets.filter((set) => set.exerciseId === exerciseId));
}

/**
 * "Est. 1RM 76 kg", or "Est. 1RM 76 kg · best 82 kg" when today is not it.
 *
 * A best that is only just above the current one would nag rather than inform,
 * so it is only worth saying once it is a kilo clear — below that they are the
 * same number wearing different rounding.
 */
export function formatOneRepMax(
  current: OneRepMax | null,
  best: OneRepMax | null,
): string {
  if (!current) return "";
  const line = `Est. 1RM ${formatKg(current.value)}`;
  if (!best || best.value <= current.value + 1) return line;
  return `${line} · best ${formatKg(best.value)}`;
}

/** Kilograms without a trailing ".0", because nobody writes 80.0 kg. */
export function formatKg(value: number): string {
  return `${Number(value.toFixed(1))} kg`;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
