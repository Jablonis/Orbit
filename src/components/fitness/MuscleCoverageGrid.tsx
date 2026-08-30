import type { MuscleGroup } from "@/lib/exercises";
import { MUSCLE_GROUPS } from "@/lib/exercises";
import { WEEKLY_FREQUENCY_TARGET } from "@/lib/training-block";

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  back: "Back",
  biceps: "Biceps",
  calves: "Calves",
  chest: "Chest",
  core: "Core",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  quads: "Quads",
  shoulders: "Shoulders",
  triceps: "Triceps",
};

/**
 * The promise, checkable at a glance.
 *
 * Every muscle group at least twice a week is the rule the programme is built
 * around, so the screen shows whether it is being kept rather than asking
 * anyone to count. Each cell carries a mark and a number as well as a colour —
 * green and amber alone would say nothing to a colour-blind reader, and this
 * is the one thing on the page that has to be unambiguous.
 */
export function MuscleCoverageGrid({
  coverage,
}: {
  coverage: Record<MuscleGroup, number>;
}) {
  return (
    <div>
      <p className="text-[13px] leading-5 text-muted-foreground">
        Every muscle group at least {WEEKLY_FREQUENCY_TARGET} times a week.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {MUSCLE_GROUPS.map((muscle) => {
          const count = coverage[muscle] ?? 0;
          const met = count >= WEEKLY_FREQUENCY_TARGET;
          return (
            <li
              className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 ${
                met
                  ? "border-[var(--hairline)] bg-[var(--wash)]"
                  : "border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_12%,var(--card))]"
              }`}
              key={muscle}
            >
              <span className="min-w-0 truncate text-[12px] font-semibold">
                {MUSCLE_LABELS[muscle]}
              </span>
              <span
                className={`shrink-0 text-[12px] font-bold tabular-nums ${
                  met ? "text-primary" : "text-[var(--warning)]"
                }`}
              >
                <span aria-hidden="true">{met ? "✓" : "!"}</span>
                <span className="ml-1">{count}×</span>
                <span className="sr-only">
                  {met
                    ? `covered ${count} times a week`
                    : `only ${count} times a week`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
