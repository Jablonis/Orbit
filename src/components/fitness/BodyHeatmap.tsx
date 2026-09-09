import {
  BODY_BACK,
  BODY_FRONT,
  INERT_PARTS,
  groupForShape,
  heatLevel,
  type BodyView,
} from "@/lib/body-map";
import type { MuscleGroup } from "@/lib/exercises";
import { MUSCLE_GROUPS } from "@/lib/exercises";
import { WEEKLY_FREQUENCY_TARGET } from "@/lib/training-block";

/**
 * The week, drawn on a body.
 *
 * The grid underneath is the record — ten cells, a mark and a number in each,
 * exact and readable by anyone. This is the glance: a back with nothing in it
 * or a pair of pale calves registers before a single number is read, which is
 * the one thing a table of counts cannot do.
 *
 * So it is deliberately *not* the only place the answer lives. Colour alone
 * says nothing to a colour-blind reader and nothing at all to a screen reader,
 * which is why the picture is labelled with the groups that fall short and the
 * grid it sits above keeps every count in text.
 */

/**
 * Pale to solid, in five steps. Step 3 is exactly the twice-a-week rule.
 *
 * Step 0 is a neutral rather than nothing: a muscle at zero has to read as a
 * muscle that was not trained, and `transparent` made the calves look like a
 * part of the drawing that had been left out.
 */
const FILL = [
  "color-mix(in srgb, var(--foreground) 9%, transparent)",
  "color-mix(in srgb, var(--primary) 20%, transparent)",
  "color-mix(in srgb, var(--primary) 38%, transparent)",
  "color-mix(in srgb, var(--primary) 62%, transparent)",
  "color-mix(in srgb, var(--primary) 88%, transparent)",
];

export function BodyHeatmap({
  coverage,
}: {
  coverage: Record<MuscleGroup, number>;
}) {
  const short = MUSCLE_GROUPS.filter(
    (group) => (coverage[group] ?? 0) < WEEKLY_FREQUENCY_TARGET,
  );
  const label =
    short.length === 0
      ? `Muscle map. Every group is trained at least ${WEEKLY_FREQUENCY_TARGET} times a week.`
      : `Muscle map. Short of ${WEEKLY_FREQUENCY_TARGET} times a week: ${short.join(", ")}.`;

  return (
    <figure aria-label={label} className="m-0" role="group">
      <div className="flex items-end justify-center gap-2">
        <BodySide coverage={coverage} view={BODY_FRONT} />
        <BodySide coverage={coverage} view={BODY_BACK} />
      </div>

      <figcaption className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <span>Less</span>
        {FILL.map((fill, level) => (
          <span
            aria-hidden="true"
            className="h-2.5 w-4 rounded-[2px] border border-[var(--hairline)]"
            key={level}
            style={{ background: fill }}
          />
        ))}
        <span>More</span>
      </figcaption>
    </figure>
  );
}

function BodySide({
  coverage,
  view,
}: {
  coverage: Record<MuscleGroup, number>;
  view: BodyView;
}) {
  return (
    <svg
      aria-hidden="true"
      // Shrinks below its cap rather than overflowing: the reflow floor
      // is 320 px and two bodies at their full width do not fit in it.
      className="h-auto w-full min-w-0 max-w-[150px] flex-1"
      focusable="false"
      viewBox={view.vb}
    >
      {/* Silhouette first, so a muscle outline always sits on top of it. */}
      {INERT_PARTS.flatMap((part) =>
        (view.p[part] ?? []).map((d, index) => (
          <path
            d={d}
            fill="var(--wash)"
            key={`${part}-${index}`}
            stroke="var(--hairline)"
            strokeWidth={1}
          />
        )),
      )}
      {Object.entries(view.p).flatMap(([shape, paths]) => {
        const group = groupForShape(shape);
        if (!group) return [];
        const level = heatLevel(coverage[group] ?? 0, WEEKLY_FREQUENCY_TARGET);
        return paths.map((d, index) => (
          <path
            d={d}
            fill={FILL[level]}
            key={`${shape}-${index}`}
            stroke="var(--hairline)"
            strokeWidth={1}
          />
        ));
      })}
    </svg>
  );
}
