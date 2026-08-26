"use client";

import type { ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { Moment } from "@/components/Moment";
import { Pip } from "@/components/brand/Pip";

/**
 * The moment the last ring closes. Shown once per day, on the device where it
 * happened, and never again for that date — a reward that repeats stops being
 * one.
 */
export function DayComplete({
  altitude,
  children,
  date,
  streak,
  tier,
}: {
  altitude: number;
  /** The share control, handed in so the moment can carry it. */
  children?: ReactNode;
  date: string;
  streak: number;
  tier: string;
}) {
  return (
    <Moment
      labelledBy="day-complete-title"
      storageKey={`orbit-day-sealed:${date}`}
      subdued={Boolean(children)}
    >
      <div className="text-center">
        <Pip burn={1} className="mx-auto" mood="sealed" size={72} />

        <div className="mx-auto mt-2 grid size-28 place-items-center">
          <svg className="size-28 -rotate-90" viewBox="0 0 112 112">
            <circle cx="56" cy="56" r="48" fill="none" stroke="var(--tasks-tint)" strokeWidth="9" />
            <circle cx="56" cy="56" r="48" fill="none" stroke="var(--tasks)" strokeWidth="9" strokeLinecap="round" pathLength={100} strokeDasharray="100" className="day-complete-arc" />
            <circle cx="56" cy="56" r="36" fill="none" stroke="var(--fitness-tint)" strokeWidth="9" />
            <circle cx="56" cy="56" r="36" fill="none" stroke="var(--fitness)" strokeWidth="9" strokeLinecap="round" pathLength={100} strokeDasharray="100" className="day-complete-arc day-complete-arc-2" />
            <circle cx="56" cy="56" r="24" fill="none" stroke="var(--finance-tint)" strokeWidth="9" />
            <circle cx="56" cy="56" r="24" fill="none" stroke="var(--finance)" strokeWidth="9" strokeLinecap="round" pathLength={100} strokeDasharray="100" className="day-complete-arc day-complete-arc-3" />
          </svg>
        </div>

        <p className="label-caps mt-6 text-muted-foreground">Day sealed</p>
        <h2
          className="mt-2 text-[26px] font-bold tracking-[-0.03em]"
          id="day-complete-title"
        >
          Every ring closed.
        </h2>

        <dl className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted p-3">
            <dt className="label-caps text-muted-foreground">Altitude</dt>
            <dd className="metric-value mt-1 text-[22px] font-bold">
              <CountUp value={altitude} />
            </dd>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <dt className="label-caps text-muted-foreground">Run</dt>
            <dd className="metric-value mt-1 text-[22px] font-bold">
              <CountUp duration={700} value={streak} />
            </dd>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <dt className="label-caps text-muted-foreground">Tier</dt>
            <dd className="mt-1 truncate text-[15px] font-semibold">{tier}</dd>
          </div>
        </dl>

        {children ? (
          <div className="mt-6 [&>div>div]:justify-center [&_p]:text-center">
            {children}
          </div>
        ) : null}
      </div>
    </Moment>
  );
}
