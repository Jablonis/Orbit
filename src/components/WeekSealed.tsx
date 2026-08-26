"use client";

import type { ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { Moment } from "@/components/Moment";
import { Pip } from "@/components/brand/Pip";
import type { WeekRecap } from "@/lib/recap";

/**
 * The week closing. Shown once, on the first opening after a week ends, and
 * never again for that week — the same rule as the day-sealed moment, on the
 * cadence people actually talk about.
 */
export function WeekSealed({
  children,
  recap,
}: {
  /** The share control, handed in so the moment can carry it. */
  children?: ReactNode;
  recap: WeekRecap;
}) {
  return (
    <Moment
      labelledBy="week-sealed-title"
      storageKey={`orbit-week-sealed:${recap.weekStart}`}
      subdued={Boolean(children)}
    >
      <div className="flex items-start gap-4">
        <Pip
          burn={0.9}
          className="shrink-0"
          mood={recap.mood}
          size={64}
        />
        <div className="min-w-0">
          <p className="label-caps text-muted-foreground">
            Week sealed · {recap.label}
          </p>
          <h2
            className="mt-1 text-[26px] font-bold leading-8 tracking-[-0.03em]"
            id="week-sealed-title"
          >
            {recap.headline}
          </h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {recap.verdict}
          </p>
        </div>
      </div>

      <ol aria-label="Last week by day" className="mt-6 flex items-end gap-2">
        {recap.days.map((day, index) => (
          <li
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            key={day.date}
          >
            <div className="flex h-28 w-full max-w-[38px] items-end rounded-full bg-muted">
              <div
                className={`week-sealed-bar w-full rounded-full ${
                  day.inOrbit ? "bg-plum" : "bg-muted-foreground/25"
                }`}
                style={{
                  animationDelay: `${index * 70}ms`,
                  height: `${Math.max(6, Math.min(100, day.score))}%`,
                }}
              />
            </div>
            <span
              className={`label-caps ${
                day.inOrbit ? "text-plum-ink" : "text-muted-foreground"
              }`}
            >
              {day.label.slice(0, 2)}
            </span>
          </li>
        ))}
      </ol>

      <dl className="mt-6 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted p-3 text-center">
          <dt className="label-caps text-muted-foreground">In orbit</dt>
          <dd className="metric-value mt-1 text-[22px] font-bold">
            <CountUp duration={700} value={recap.daysInOrbit} />/7
          </dd>
        </div>
        <div className="rounded-xl bg-muted p-3 text-center">
          <dt className="label-caps text-muted-foreground">Altitude</dt>
          <dd className="metric-value mt-1 text-[22px] font-bold">
            <CountUp value={recap.altitudeEnd} />
          </dd>
        </div>
        <div className="rounded-xl bg-muted p-3 text-center">
          <dt className="label-caps text-muted-foreground">Tier</dt>
          <dd className="mt-1 truncate text-[15px] font-semibold">
            {recap.tier.name}
          </dd>
        </div>
      </dl>

      {children ? <div className="mt-6">{children}</div> : null}
    </Moment>
  );
}
