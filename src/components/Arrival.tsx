"use client";

import type { ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { Moment } from "@/components/Moment";
import { Pip } from "@/components/brand/Pip";
import type { Arrival as VoyageArrival } from "@/lib/voyage";
import { format } from "@/lib/voyage";

/**
 * Getting somewhere.
 *
 * The day-sealed moment marks a day and the week-sealed one marks a week; both
 * come round again. This one never does: a place is reached once, and the whole
 * point of a voyage is that arriving is rare.
 */
export function Arrival({
  arrival,
  children,
  daysTaken,
  distance,
}: {
  arrival: VoyageArrival;
  /** The share control, handed in so the moment can carry it. */
  children?: ReactNode;
  daysTaken: number;
  distance: number;
}) {
  return (
    <Moment
      closeLabel="Keep going"
      labelledBy="arrival-title"
      storageKey={`orbit-arrived:${arrival.leg.id}`}
      subdued={Boolean(children)}
    >
      <div className="text-center">
        <Pip burn={1} className="mx-auto" mood="sealed" seed={5} size={76} />

        <p className="label-caps mt-5 text-muted-foreground">Arrived</p>
        <h2
          className="mt-2 text-[30px] font-bold leading-9 tracking-[-0.03em]"
          id="arrival-title"
        >
          {arrival.leg.name}
        </h2>
        <p className="mx-auto mt-2 max-w-[36ch] text-[14px] text-muted-foreground">
          {arrival.leg.blurb}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted p-3">
            <dt className="label-caps text-muted-foreground">Travelled</dt>
            <dd className="metric-value mt-1 text-[22px] font-bold">
              <CountUp grouped value={distance} />
              <span className="ml-1 text-[13px] font-semibold text-muted-foreground">
                km
              </span>
            </dd>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <dt className="label-caps text-muted-foreground">Days out</dt>
            <dd className="metric-value mt-1 text-[22px] font-bold">
              <CountUp duration={700} value={daysTaken} />
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-[13px] text-muted-foreground">
          {format(distance)} of days you actually did. None of it comes back off.
        </p>

        {children ? (
          <div className="mt-6 [&>div>div]:justify-center [&_p]:text-center">
            {children}
          </div>
        ) : null}
      </div>
    </Moment>
  );
}
