"use client";

import { useEffect, useRef, useState } from "react";
import { Pip } from "@/components/brand/Pip";
import {
  type Climb,
  CLIMB_FLOOR,
  formatMultiplier,
} from "@/lib/mascot";

const WIDTH = 300;
const HEIGHT = 160;
const START_X = 10;
const START_Y = 148;
const END_X = 286;
const CEILING = 18;

/**
 * The day as a climb.
 *
 * Pip rides a curve out of the corner while the multiplier ticks up, and both
 * stop where the day actually stopped. The number is real — what the orbit is
 * now over what it was yesterday — so a day with nothing on it lands on 0.85
 * and the curve sags to prove it. Nothing here is a wager and nothing crashes:
 * the only thing being multiplied is work already done.
 */
export function RocketClimb({
  climb,
  label,
}: {
  climb: Climb;
  label?: string;
}) {
  const [shown, setShown] = useState(climb.multiplier);
  const [ready, setReady] = useState(false);
  const frame = useRef(0);

  const endY = START_Y - climb.peak * (START_Y - CEILING);
  const bend = endY + (START_Y - endY) * 0.55;
  const path = `M${START_X} ${START_Y} C 110 ${START_Y}, 196 ${bend}, ${END_X} ${endY}`;

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      const id = window.requestAnimationFrame(() => {
        setShown(climb.multiplier);
        setReady(true);
      });
      return () => window.cancelAnimationFrame(id);
    }

    // The number starts where an empty day would leave it, so the count is the
    // distance the day actually travelled.
    const from = CLIMB_FLOOR;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(from + (climb.multiplier - from) * eased);
      if (progress < 1) frame.current = window.requestAnimationFrame(step);
    };

    const id = window.requestAnimationFrame(() => {
      setReady(true);
      frame.current = window.requestAnimationFrame(step);
    });
    return () => {
      window.cancelAnimationFrame(id);
      window.cancelAnimationFrame(frame.current);
    };
  }, [climb.multiplier]);

  return (
    <figure className="relative m-0">
      <svg
        aria-hidden="true"
        className="h-[150px] w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <defs>
          <linearGradient id="rocket-climb-line" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" stopColor="var(--plum)" stopOpacity="0.25" />
            <stop offset="1" stopColor="var(--plum)" />
          </linearGradient>
          <linearGradient id="rocket-climb-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--plum)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--plum)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={`${path} L ${END_X} ${START_Y} L ${START_X} ${START_Y} Z`}
          fill="url(#rocket-climb-fill)"
          className={ready ? "rocket-climb-area" : "opacity-0"}
        />
        <path
          className={ready ? "rocket-climb-line" : "opacity-0"}
          d={path}
          fill="none"
          stroke="url(#rocket-climb-line)"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>

      <span className="pointer-events-none absolute inset-0">
        <span
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${
            ready ? "rocket-climb-pip" : "opacity-0"
          }`}
          style={
            {
              "--climb-x": `${(END_X / WIDTH) * 100}%`,
              "--climb-y": `${(endY / HEIGHT) * 100}%`,
              left: `${(END_X / WIDTH) * 100}%`,
              top: `${(endY / HEIGHT) * 100}%`,
            } as React.CSSProperties
          }
        >
          <Pip
            burn={climb.rising ? 0.9 : 0.2}
            mood={climb.rising ? "soaring" : "grounded"}
            size={44}
          />
        </span>
      </span>

      <figcaption className="pointer-events-none absolute inset-0 flex flex-col items-start justify-end p-1">
        <span className="metric-value text-[34px] font-bold leading-none tracking-[-0.03em]">
          {formatMultiplier(shown)}
        </span>
        <span className="mt-1 text-[12px] text-muted-foreground">
          {label ?? `altitude ${climb.from} → ${climb.to}`}
        </span>
      </figcaption>
    </figure>
  );
}
