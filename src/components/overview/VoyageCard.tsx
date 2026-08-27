"use client";

import { useState } from "react";
import { Pip } from "@/components/brand/Pip";
import { TintPanel } from "@/components/ui/tint-panel";
import { Badge } from "@/components/ui/badge";
import {
  VOYAGE_LEGS,
  type Voyage,
  type VoyageLeg,
  format,
  getVoyageLine,
} from "@/lib/voyage";

/**
 * How far you have come, and what is next.
 *
 * The rail is a map rather than a scale: the places are spaced evenly because
 * what matters is which one is behind you and which one is ahead, not that
 * Saturn is drawn eight times further out than the Moon.
 */
export function VoyageCard({
  locale,
  voyage,
}: {
  locale: string;
  voyage: Voyage;
}) {
  const reached = VOYAGE_LEGS.findIndex((leg) => leg.id === voyage.current.id);
  // Pip sits between the place behind and the place ahead, in rail units.
  const position =
    voyage.next === null
      ? reached
      : reached + voyage.progress;
  const left = (position / (VOYAGE_LEGS.length - 1)) * 100;
  const recent = [...voyage.arrivals].reverse().slice(0, 3);
  // The rail was a row of dots with tooltips nobody on a phone can reach. Each
  // one is a place with a name, a distance and, if it has been passed, a date —
  // so each one is a button, and asking is a tap.
  const [openId, setOpenId] = useState<string | null>(null);
  const open: VoyageLeg | null =
    VOYAGE_LEGS.find((leg) => leg.id === openId) ?? null;
  const openArrival = voyage.arrivals.find(
    (arrival) => arrival.leg.id === openId,
  );
  const openIndex = VOYAGE_LEGS.findIndex((leg) => leg.id === openId);
  const dateOf = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(`${date}T12:00:00Z`));

  return (
    <TintPanel className="settle-in settle-3 flex flex-col gap-5" system="quiet">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-muted-foreground">Voyage</p>
          <p className="mt-1.5 text-[20px] font-bold leading-7 tracking-[-0.02em]">
            {open ? open.name : getVoyageLine(voyage)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {open
              ? `${open.blurb} ${
                  openArrival
                    ? `Reached ${dateOf(openArrival.date)}.`
                    : openIndex <= reached
                      ? "Where this voyage started."
                      : `${format(Math.max(0, open.distance - voyage.distance))} still to go.`
                }`
              : (voyage.next ?? voyage.current).blurb}
          </p>
        </div>
        <Badge className="shrink-0" variant="plum">
          {format(voyage.distance)}
        </Badge>
      </div>

      <div className="relative pt-9">
        {/* Pip rides the rail at the point the distance has actually reached. */}
        <span
          className="voyage-rider absolute top-0 -translate-x-1/2"
          style={{ left: `${left}%` }}
        >
          <Pip burn={voyage.pace > 0 ? 0.8 : 0.2} mood="cruising" seed={4} size={32} />
        </span>

        <ol aria-label="The map" className="flex items-center">
          {VOYAGE_LEGS.map((leg, index) => {
            const passed = index <= reached;
            const isCurrent = index === reached;
            return (
              <li className="flex min-w-0 flex-1 items-center last:flex-none" key={leg.id}>
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={leg.name}
                  aria-pressed={openId === leg.id}
                  className="group -mx-3.5 grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-150 first:-ml-3.5 hover:scale-125 active:scale-90"
                  onClick={() =>
                    setOpenId((current) => (current === leg.id ? null : leg.id))
                  }
                  type="button"
                >
                  <span
                    className={`block rounded-full transition-all ${
                      openId === leg.id ? "ring-2 ring-plum ring-offset-2 ring-offset-[var(--card)] " : ""
                    }${
                      isCurrent
                        ? "size-3.5 bg-plum ring-4 ring-plum/20"
                        : passed
                          ? "size-2.5 bg-plum"
                          : "size-2.5 bg-muted-foreground/25"
                    }`}
                  />
                </button>
                {index < VOYAGE_LEGS.length - 1 ? (
                  <span
                    className={`h-0.5 min-w-0 flex-1 ${
                      index < reached ? "bg-plum/50" : "bg-muted-foreground/20"
                    }`}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-semibold">{voyage.current.name}</span>
          {voyage.next ? (
            <span className="text-[12px] text-muted-foreground">
              {voyage.next.name} · {format(voyage.toNext)}
            </span>
          ) : null}
        </div>
      </div>

      {recent.length > 0 ? (
        <ul className="flex flex-col gap-0.5 border-t border-border pt-3">
          {recent.map((arrival) => (
            <li key={arrival.leg.id}>
              <button
                className="press-row flex min-h-11 w-full items-baseline justify-between gap-3 rounded-xl px-2 text-left hover:bg-muted"
                onClick={() =>
                  setOpenId((current) =>
                    current === arrival.leg.id ? null : arrival.leg.id,
                  )
                }
                type="button"
              >
                <span className="truncate text-[13px] font-semibold">
                  {arrival.leg.name}
                </span>
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${arrival.date}T12:00:00Z`))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </TintPanel>
  );
}
