"use client";

import type { ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { Moment } from "@/components/Moment";
import { DayAscent } from "@/components/DayAscent";
import { Pip } from "@/components/brand/Pip";
import type { Ascent } from "@/lib/ascent";

/**
 * The moment the last ring closes. Shown once per day, on the device where it
 * happened, and never again for that date — a reward that repeats stops being
 * one.
 */
export function DayComplete({
  altitude,
  ascent,
  children,
  date,
  streak,
  tier,
}: {
  altitude: number;
  ascent: Ascent;
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

        <div className="mt-4 text-left">
          <DayAscent ascent={ascent} />
        </div>

        <p className="label-caps mt-5 text-muted-foreground">Day sealed</p>
        <h2
          className="mt-2 text-[26px] font-bold tracking-[-0.03em]"
          id="day-complete-title"
        >
          Every stage done.
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
