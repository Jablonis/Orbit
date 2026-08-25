"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { Button } from "@/components/ui/button";
import type { WeekRecap } from "@/lib/recap";

const STORAGE_PREFIX = "orbit-week-sealed:";

function alreadySeen(weekStart: string) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + weekStart) === "1";
  } catch {
    return true;
  }
}

function remember(weekStart: string) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + weekStart, "1");
  } catch {
    // A private window will not keep it. Showing it twice is not a failure.
  }
}

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
  const [open, setOpen] = useState(false);
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (alreadySeen(recap.weekStart)) return;
    const id = window.setTimeout(() => {
      setOpen(true);
      try {
        navigator.vibrate?.([14, 45, 22]);
      } catch {
        // Some browsers reject it outside a user gesture; that is fine.
      }
    }, 450);
    return () => window.clearTimeout(id);
  }, [recap.weekStart]);

  const close = () => {
    remember(recap.weekStart);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => dismissRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  });

  if (!open) return null;

  return (
    <div
      aria-labelledby="week-sealed-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4 backdrop-blur-sm"
      onClick={close}
      role="dialog"
    >
      <div
        className="day-complete w-full max-w-md rounded-2xl bg-card p-8 shadow-[0_40px_80px_-40px_rgba(27,26,31,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="label-caps text-muted-foreground">
          Week sealed · {recap.label}
        </p>
        <h2
          className="mt-2 text-[28px] font-bold leading-8 tracking-[-0.03em]"
          id="week-sealed-title"
        >
          {recap.headline}
        </h2>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {recap.verdict}
        </p>

        <ol
          aria-label="Last week by day"
          className="mt-6 flex items-end gap-2"
        >
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

        <Button
          className="mt-4 w-full"
          onClick={close}
          ref={dismissRef}
          variant={children ? "ghost" : "default"}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
