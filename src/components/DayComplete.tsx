"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CountUp } from "@/components/CountUp";
import { Pip } from "@/components/brand/Pip";
import { Button } from "@/components/ui/button";

const STORAGE_PREFIX = "orbit-day-sealed:";

function alreadySeen(date: string) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + date) === "1";
  } catch {
    return true;
  }
}

function remember(date: string) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + date, "1");
  } catch {
    // A private window will not keep it. Showing it twice is not a failure.
  }
}

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
  const [open, setOpen] = useState(false);
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (alreadySeen(date)) return;
    const id = window.setTimeout(() => {
      setOpen(true);
      // A short double tap where the device supports it. Silent everywhere
      // else, and never a substitute for what is on screen.
      try {
        navigator.vibrate?.([14, 45, 22]);
      } catch {
        // Some browsers reject it outside a user gesture; that is fine.
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, [date]);

  const close = () => {
    remember(date);
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
      aria-labelledby="day-complete-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4 backdrop-blur-sm"
      onClick={close}
      role="dialog"
    >
      <div
        className="day-complete w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-[0_40px_80px_-40px_rgba(27,26,31,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
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
