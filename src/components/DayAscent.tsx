import Link from "next/link";
import { Pip } from "@/components/brand/Pip";
import type { Ascent, AscentSystem } from "@/lib/ascent";

// Written out rather than composed, so Tailwind can see every class it has to
// generate.
const fill: Record<AscentSystem, string> = {
  finance: "bg-finance",
  fitness: "bg-fitness",
  tasks: "bg-tasks",
};

// Where each column is actually worked on. A bar this size reads as a control,
// so it is one: it goes to the page that moves it.
const href: Record<AscentSystem, string> = {
  finance: "/finance",
  fitness: "/fitness",
  tasks: "/tasks",
};

const ink: Record<AscentSystem, string> = {
  finance: "text-finance-ink",
  fitness: "text-fitness-ink",
  tasks: "text-tasks-ink",
};

/**
 * The day, drawn as a launch.
 *
 * Three columns of thrust rise from a pad; a dashed line crosses where orbit
 * begins; the day's own score rides in its own lane at the right and crosses
 * that line when the day counts. Wide rather than square, because a phone has
 * width to spare and no height.
 *
 * The full form carries labels and Pip. The compact one is the same instrument
 * at badge size: three columns and the line, nothing else.
 */
export function DayAscent({
  ascent,
  compact = false,
}: {
  ascent: Ascent;
  compact?: boolean;
}) {
  const height = compact ? 46 : 180;
  const lineY = (1 - ascent.orbitLine) * height;
  // The rider needs a lane of its own, or it stands on the columns.
  const lane = compact ? 0 : 62;

  return (
    <div className={compact ? "" : "flex w-full flex-col gap-3"}>
      <div
        className="relative"
        style={{ height, width: compact ? 46 : "100%" }}
      >
        <ol
          className={`absolute inset-y-0 left-0 flex items-end ${
            compact ? "gap-1" : "gap-3 sm:gap-4"
          }`}
          style={{ right: lane }}
        >
          {ascent.columns.map((column, index) => {
            const bar = (
              <div
                className={`relative flex w-full items-end overflow-hidden rounded-t-2xl bg-muted/70 ${
                  compact ? "" : "max-w-[54px]"
                }`}
                style={{ height }}
              >
                <div
                  className={`ascent-column w-full rounded-t-2xl ${
                    column.idle ? "bg-muted-foreground/20" : fill[column.system]
                  }`}
                  style={{
                    animationDelay: `${index * 90}ms`,
                    height: `${column.height * 100}%`,
                  }}
                />
              </div>
            );
            return (
              <li
                className="flex min-w-0 flex-1 justify-center"
                key={column.system}
              >
                {compact ? (
                  bar
                ) : (
                  // The compact badge already lives inside a link, so only the
                  // full instrument carries its own.
                  <Link
                    aria-label={`${column.label}: ${column.value}`}
                    className="flex w-full justify-center rounded-t-2xl transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
                    href={href[column.system]}
                  >
                    {bar}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        {/* Drawn after the columns, so the line that decides the day is read
            across them rather than buried under them. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-plum/60"
          style={{ top: lineY }}
        >
          {compact ? null : (
            <span className="label-caps absolute -top-4 left-0 text-[11px] text-plum-ink">
              Orbit
            </span>
          )}
        </div>

        {/* The pad everything stands on. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-border"
          style={{ right: lane }}
        />

        {compact ? null : (
          <div
            className="ascent-rider pointer-events-none absolute right-0 flex translate-y-1/2 items-center gap-1.5"
            style={{ bottom: `${ascent.altitude * 100}%` }}
          >
            <span className="metric-value text-[13px] font-bold">
              {Math.round(ascent.altitude * 100)}
            </span>
            <Pip
              burn={ascent.inOrbit ? 0.9 : 0.35}
              mood={
                ascent.total > 0 && ascent.closed === ascent.total
                  ? "sealed"
                  : ascent.inOrbit
                    ? "soaring"
                    : "lifting"
              }
              seed={2}
              size={36}
            />
          </div>
        )}
      </div>

      {compact ? null : (
        <ul className="flex gap-3 sm:gap-4" style={{ paddingRight: lane }}>
          {ascent.columns.map((column) => (
            <li className="min-w-0 flex-1 text-center" key={column.system}>
              <Link
                className="block rounded-xl py-1 transition-colors hover:bg-muted"
                href={href[column.system]}
              >
                <span className="label-caps block truncate text-muted-foreground">
                  {column.label}
                </span>
                <span
                  className={`metric-value block text-[15px] font-bold ${
                    column.closed ? ink[column.system] : ""
                  }`}
                >
                  {column.value}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
