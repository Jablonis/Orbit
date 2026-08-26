"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * A moment: the one thing Orbit interrupts you for.
 *
 * The day sealing and the week closing are the same object — an overlay that
 * arrives once, is remembered per device so it never repeats, and leaves on the
 * path it came in on. Both used to vanish on a cut, which is what made them
 * read as a notification rather than as a moment.
 */
export function Moment({
  children,
  closeLabel = "Close",
  labelledBy,
  storageKey,
  subdued = false,
}: {
  children: ReactNode;
  closeLabel?: string;
  labelledBy: string;
  /** Remembered per device: a reward that repeats stops being one. */
  storageKey: string;
  /** True when the moment carries its own action and Close is the quiet one. */
  subdued?: boolean;
}) {
  const [state, setState] = useState<"closed" | "closing" | "open">("closed");
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (alreadySeen(storageKey)) return;
    const id = window.setTimeout(() => {
      setState("open");
      try {
        // A short double tap where the device supports it. Silent everywhere
        // else, and never a substitute for what is on screen.
        navigator.vibrate?.([14, 45, 22]);
      } catch {
        // Some browsers reject it outside a user gesture; that is fine.
      }
    }, 420);
    return () => window.clearTimeout(id);
  }, [storageKey]);

  const close = () => {
    remember(storageKey);
    setState((current) => (current === "open" ? "closing" : current));
  };

  useEffect(() => {
    if (state !== "open") return;
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

  if (state === "closed") return null;

  return (
    <div
      aria-labelledby={labelledBy}
      aria-modal="true"
      className="moment-veil fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4 backdrop-blur-sm"
      data-state={state}
      onClick={close}
      role="dialog"
    >
      <div
        className="moment-panel w-full max-w-md rounded-2xl bg-card p-8 shadow-[0_40px_80px_-40px_rgba(27,26,31,0.5)]"
        data-state={state}
        // The overlay unmounts when the panel itself has finished leaving, so
        // the exit is seen rather than assumed. Animations inside the panel —
        // a ring closing, a flame settling — bubble up here too, and one of
        // them ending mid-exit would otherwise cut the moment short.
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.animationName !== "moment-out") return;
          setState("closed");
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}

        <Button
          className="mt-4 w-full"
          onClick={close}
          ref={dismissRef}
          variant={subdued ? "ghost" : "default"}
        >
          {closeLabel}
        </Button>
      </div>
    </div>
  );
}

function alreadySeen(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function remember(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // A private window will not keep it. Showing it twice is not a failure.
  }
}
