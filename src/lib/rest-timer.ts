/**
 * How long to rest.
 *
 * Not a stopwatch's problem — a programming one. Three minutes between heavy
 * squats and forty-five seconds between lateral raises are not preferences,
 * they are what the rep range needs to be repeatable, and a set logged after
 * the wrong rest is not comparable to the same set in week one.
 *
 * Three durations, because a fourth would be a decision nobody wants to make
 * between sets. The timer they drive is a suggestion with a big obvious way to
 * skip it: Orbit says what the programme implies and never stands in the way.
 */

/** Heavy compound work: the set is limited by the nervous system, not the lungs. */
export const REST_HEAVY_SECONDS = 180;
/** Everything else compound, and anything in the eight-to-twelve range. */
export const REST_COMPOUND_SECONDS = 120;
/** Isolation: the muscle recovers long before the rest of you does. */
export const REST_ISOLATION_SECONDS = 90;

/** The rep count below which a set counts as heavy rather than hypertrophy. */
const HEAVY_REP_CEILING = 6;

export function restSecondsFor(exercise: {
  isCompound: boolean;
  repHigh: number;
}): number {
  if (!exercise.isCompound) return REST_ISOLATION_SECONDS;
  return exercise.repHigh <= HEAVY_REP_CEILING
    ? REST_HEAVY_SECONDS
    : REST_COMPOUND_SECONDS;
}

/** "2:00", "0:45" — a clock, because that is what a rest is read as. */
export function formatRest(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * What the timer says out loud, for the screen reader and for the tab title.
 * "Rest: 1 minute 30 seconds left" rather than a colon nobody can hear.
 */
export function describeRest(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  if (safe === 0) return "Rest over";
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  const parts = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (rest > 0) parts.push(`${rest} second${rest === 1 ? "" : "s"}`);
  return `${parts.join(" ")} left`;
}

/** How far through the rest we are, 0 to 1 — the width of the bar. */
export function restProgress(remaining: number, total: number): number {
  if (total <= 0) return 1;
  const done = (total - remaining) / total;
  return Math.min(1, Math.max(0, done));
}
