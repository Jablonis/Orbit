"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeRest, formatRest, restProgress } from "@/lib/rest-timer";

/**
 * The rest between sets.
 *
 * It starts itself when a set is saved, because that is the moment the rest
 * actually begins and asking someone to press a second button is asking them
 * to forget. Everything else about it is a suggestion with an obvious way out:
 * Skip ends it, +30s extends it, and nothing anywhere is blocked while it runs.
 *
 * Three details are the whole reason this is worth having rather than glancing
 * at a phone clock:
 *
 * - **The screen stays on.** A wake lock held for the duration of the rest,
 *   released the moment it ends. A phone that sleeps between sets means
 *   unlocking it with chalk on your hands, which is why nobody uses the clock.
 * - **It survives the tab going away.** The end time is a timestamp, not a
 *   counter, so a screen that locks anyway or a tab that is backgrounded comes
 *   back with the right number instead of one frozen where it left off.
 * - **It says it is over without needing to be watched.** A short vibration
 *   where the device has one, and a live region for a screen reader.
 *
 * Ticking once a second is the point of the component, so `--duration-state`
 * and the rest of the motion tokens do not apply: the bar is a readout, not an
 * animation, and it does not move under `prefers-reduced-motion` either.
 *
 * A new rest is a new instance: the caller keys this on the start time, so
 * saving a second exercise remounts it with a fresh clock rather than syncing
 * props into state behind an effect.
 */
export function RestTimer({
  onDone,
  seconds,
  startedAt,
}: {
  onDone: () => void;
  /** The full rest, for the bar and the "+30s" arithmetic. */
  seconds: number;
  /** Milliseconds since the epoch. Key the component on it to restart. */
  startedAt: number;
}) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const endsAt = useRef(startedAt + seconds * 1000);
  const finished = useRef(false);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, (endsAt.current - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !finished.current) {
        finished.current = true;
        // Best effort: iOS has no vibration API, and a phone in a pocket on a
        // gym floor is exactly where the one that does earns its keep.
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate?.([120, 80, 120]);
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    // The interval is throttled to nothing in a background tab, so the clock is
    // re-read on the way back rather than trusted to have kept counting.
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useWakeLock(remaining > 0);

  const done = remaining <= 0;
  const extend = useCallback(() => {
    endsAt.current = Math.max(Date.now(), endsAt.current) + 30_000;
    finished.current = false;
    setTotal((current) => current + 30);
    setRemaining((endsAt.current - Date.now()) / 1000);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--wash)] p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="metric-value text-[20px] font-bold tabular-nums text-foreground">
            {formatRest(remaining)}
          </p>
          <p className="text-[12px] font-semibold text-muted-foreground">
            {done ? "Rest over" : "Resting"}
          </p>
        </div>
        {/* The readout in words, for anyone who is not looking at it. Polite,
            because it changes every second and must never interrupt. */}
        <p aria-live="polite" className="sr-only">
          {done ? "Rest over" : describeRest(remaining)}
        </p>
        <div
          aria-hidden="true"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hairline)]"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${restProgress(remaining, total) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          className="min-h-11 rounded-xl border border-[var(--hairline)] px-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
          onClick={extend}
          type="button"
        >
          +30s
        </button>
        <button
          className="min-h-11 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
          onClick={onDone}
          type="button"
        >
          {done ? "Done" : "Skip"}
        </button>
      </div>
    </div>
  );
}

type WakeLockSentinelLike = { release: () => Promise<void> };

/**
 * Keeps the screen awake while a rest is running, and lets it sleep the moment
 * one is not. Unsupported everywhere it is unsupported — Safari before 16.4,
 * any browser over plain HTTP — and every path here treats that as normal
 * rather than as an error worth showing anyone.
 */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const api = (
      navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    if (!api) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let released = false;

    const acquire = async () => {
      if (released || document.visibilityState !== "visible") return;
      try {
        sentinel = await api.request("screen");
      } catch {
        // Denied, or the tab lost focus mid-request. Nothing to say about it.
      }
    };

    // A lock is dropped whenever the tab is hidden and is not handed back, so
    // coming back to the page has to ask for it again.
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
