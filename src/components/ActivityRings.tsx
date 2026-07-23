"use client";

import { useEffect, useState } from "react";

type RingValues = {
  finance: number;
  fitness: number;
  tasks: number;
};

export function ActivityRings({ finance, fitness, tasks }: RingValues) {
  const [displayed, setDisplayed] = useState<RingValues>({
    finance: 0,
    fitness: 0,
    tasks: 0,
  });
  const score = Math.round(
    (displayed.finance + displayed.fitness + displayed.tasks) / 3,
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDisplayed({ finance, fitness, tasks });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [finance, fitness, tasks]);

  return (
    <div
      aria-label={`Daily progress: tasks ${tasks}%, fitness ${fitness}%, finance ${finance}%`}
      className="relative grid aspect-square place-items-center"
      role="img"
    >
      <Ring color="var(--accent-highlight)" radius={90} stroke={16} value={displayed.tasks} />
      <Ring color="var(--accent-primary)" radius={68} stroke={16} value={displayed.fitness} />
      <Ring color="var(--accent-info)" radius={46} stroke={16} value={displayed.finance} />
      <div
        className="absolute grid h-20 w-20 place-items-center rounded-full bg-[var(--canvas)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        key={score}
      >
        <span className="ring-score-enter text-[24px] font-semibold text-white">
          {score}
        </span>
      </div>
    </div>
  );
}

function Ring({
  color,
  radius,
  stroke,
  value,
}: {
  color: string;
  radius: number;
  stroke: number;
  value: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference -
    (Math.max(0, Math.min(value, 100)) / 100) * circumference;

  return (
    <svg
      aria-hidden="true"
      className="absolute h-full w-full -rotate-90"
      viewBox="0 0 220 220"
    >
      <circle
        cx="110"
        cy="110"
        fill="none"
        r={radius}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      <circle
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        cx="110"
        cy="110"
        fill="none"
        r={radius}
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
    </svg>
  );
}
