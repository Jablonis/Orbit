"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that arrives rather than appears. Reduced-motion readers get the
 * value immediately — the point is the value, the count is the flourish.
 */
export function CountUp({
  className,
  duration = 900,
  value,
}: {
  className?: string;
  duration?: number;
  value: number;
}) {
  const [shown, setShown] = useState(value);
  const frame = useRef(0);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      const id = window.requestAnimationFrame(() => setShown(value));
      return () => window.cancelAnimationFrame(id);
    }

    const from = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic: fast first, settles into the number
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (progress < 1) frame.current = window.requestAnimationFrame(step);
    };
    frame.current = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame.current);
  }, [duration, value]);

  return <span className={className}>{shown}</span>;
}
