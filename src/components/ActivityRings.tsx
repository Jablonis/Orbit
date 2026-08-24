"use client";

import { useEffect, useId, useState } from "react";
import { getRingGeometry } from "@/lib/activity-rings";

type RingValues = {
  finance: number;
  fitness: number;
  tasks: number;
};

type RingDefinition = {
  delay: number;
  from: string;
  key: keyof RingValues;
  label: string;
  radius: number;
  to: string;
};

const STROKE = 21;
const CENTER = 120;

const rings: RingDefinition[] = [
  {
    delay: 0,
    from: "var(--ring-tasks-from)",
    key: "tasks",
    label: "Tasks",
    radius: 99,
    to: "var(--ring-tasks-to)",
  },
  {
    delay: 90,
    from: "var(--ring-fitness-from)",
    key: "fitness",
    label: "Fitness",
    radius: 72,
    to: "var(--ring-fitness-to)",
  },
  {
    delay: 180,
    from: "var(--ring-finance-from)",
    key: "finance",
    label: "Finance",
    radius: 45,
    to: "var(--ring-finance-to)",
  },
];

/**
 * Daily rings in the Apple Fitness idiom: one thick ring per area, filled from
 * empty on every visit, carried past the goal instead of stopping at it.
 */
export function ActivityRings({ finance, fitness, tasks }: RingValues) {
  const instanceId = useId().replace(/:/g, "");
  const target: RingValues = { finance, fitness, tasks };
  const [displayed, setDisplayed] = useState<RingValues>({
    finance: 0,
    fitness: 0,
    tasks: 0,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDisplayed({ finance, fitness, tasks });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [finance, fitness, tasks]);

  return (
    <div
      aria-label={rings
        .map((ring) => `${ring.label} ${Math.round(target[ring.key])}%`)
        .join(", ")}
      className="relative aspect-square w-full"
      role="img"
    >
      <svg className="h-full w-full" viewBox="0 0 240 240">
        <defs>
          {rings.map((ring) => (
            <linearGradient
              gradientTransform={`rotate(${
                getRingGeometry(displayed[ring.key], ring.radius).capAngle
              } 0.5 0.5)`}
              id={`${instanceId}-${ring.key}`}
              key={ring.key}
              x1="0.5"
              x2="0.5"
              y1="1"
              y2="0"
            >
              <stop offset="0%" stopColor={ring.from} />
              <stop offset="100%" stopColor={ring.to} />
            </linearGradient>
          ))}
          <filter height="300%" id="ring-cap-shadow" width="300%" x="-100%" y="-100%">
            <feDropShadow
              dx="0"
              dy="0"
              floodColor="#000"
              floodOpacity="0.45"
              stdDeviation="2.2"
            />
          </filter>
        </defs>

        {/* Rings start at twelve o'clock and sweep clockwise. */}
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          {rings.map((ring) => (
              <Ring
              definition={ring}
              instanceId={instanceId}
              key={ring.key}
              value={displayed[ring.key]}
            />
          ))}
        </g>
        {/* Caps live outside the rotated group so their own rotation composes
            cleanly with a CSS transition. */}
        {rings.map((ring) => (
          <OvershootCap
            definition={ring}
            instanceId={instanceId}
            key={ring.key}
            value={displayed[ring.key]}
          />
        ))}
      </svg>
    </div>
  );
}

function Ring({
  definition,
  instanceId,
  value,
}: {
  definition: RingDefinition;
  instanceId: string;
  value: number;
}) {
  const geometry = getRingGeometry(value, definition.radius);
  const gradient = `url(#${instanceId}-${definition.key})`;
  const transition = `stroke-dashoffset 900ms var(--ease-ring) ${definition.delay}ms, transform 900ms var(--ease-ring) ${definition.delay}ms`;

  return (
    <g>
      <circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={definition.radius}
        stroke={definition.to}
        strokeOpacity={0.15}
        strokeWidth={STROKE}
      />

      {geometry.laps > 0 ? (
        <circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={definition.radius}
          stroke={gradient}
          strokeWidth={STROKE}
        />
      ) : null}

      <circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={definition.radius}
        stroke={gradient}
        strokeDasharray={geometry.circumference}
        strokeDashoffset={geometry.strokeDashoffset}
        strokeLinecap="round"
        strokeWidth={STROKE}
        style={{ transition }}
      />
    </g>
  );
}

/**
 * The head of a ring that has passed its goal, drawn over the closed ring with
 * a shadow so the overlap reads as depth rather than a colour change.
 */
function OvershootCap({
  definition,
  instanceId,
  value,
}: {
  definition: RingDefinition;
  instanceId: string;
  value: number;
}) {
  const geometry = getRingGeometry(value, definition.radius);
  if (geometry.laps < 1) return null;

  return (
    <g
      filter={`url(#${instanceId}-cap-shadow)`}
      style={{
        transform: `rotate(${geometry.capAngle}deg)`,
        transformBox: "view-box",
        transformOrigin: `${CENTER}px ${CENTER}px`,
        transition: `transform 900ms var(--ease-ring) ${definition.delay}ms`,
      }}
    >
      <circle
        cx={CENTER}
        cy={CENTER - definition.radius}
        fill={definition.to}
        r={STROKE / 2}
      />
    </g>
  );
}
