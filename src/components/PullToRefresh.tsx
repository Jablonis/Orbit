"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pip } from "@/components/brand/Pip";

/** How far you have to pull before letting go actually reloads. */
const THRESHOLD = 70;
/** Where the rubber band stops giving, so a long drag cannot run off screen. */
const CEILING = 116;
/** Half a pixel of travel per pixel of finger: the resistance that says stop. */
const RESISTANCE = 0.5;

/**
 * Pull down at the top of a page to reload it.
 *
 * Installed to a home screen, Orbit is a standalone app, and a standalone app
 * on iOS has no browser chrome and therefore no reload — the gesture everyone
 * already knows is simply missing. So it is built: the same rubber band, the
 * same commitment threshold, and Pip on the end of it instead of a spinner.
 *
 * Only from a genuine top-of-page downward drag, and never while a dialog is
 * open, so it cannot fire under the task editor or steal a swipe from a
 * sideways-scrolling row.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  // Whether a finger is currently on it. Held as state rather than read off a
  // ref, because it decides how the indicator is styled and a ref read during
  // render is a value React never promised would be current.
  const [dragging, setDragging] = useState(false);
  // The handlers are bound once, so anything they read has to be a ref: a
  // value closed over at mount is the value at mount forever.
  const startY = useRef<number | null>(null);
  const distance = useRef(0);
  const busy = useRef(false);

  // The handlers are bound once and would otherwise close over the first value
  // of `pending` forever. Mirroring it onto a ref is the whole job of this
  // effect — nothing here sets state, so nothing here can cascade.
  useEffect(() => {
    busy.current = pending;
  }, [pending]);

  useEffect(() => {
    const atTop = () =>
      window.scrollY <= 0 && !document.querySelector("dialog[open]");

    const onStart = (event: TouchEvent) => {
      if (busy.current || event.touches.length !== 1 || !atTop()) {
        startY.current = null;
        return;
      }
      startY.current = event.touches[0].clientY;
      distance.current = 0;
    };

    const onMove = (event: TouchEvent) => {
      if (startY.current === null || busy.current) return;
      const delta = event.touches[0].clientY - startY.current;

      // Upward, or the page has scrolled away from the top: this is a scroll,
      // not a pull. Let it go rather than fighting it.
      if (delta <= 0 || window.scrollY > 0) {
        startY.current = null;
        distance.current = 0;
        setPull(0);
        return;
      }

      const travel = Math.min(CEILING, delta * RESISTANCE);
      distance.current = travel;
      setDragging(true);
      setPull(travel);
      // Only once we are actually pulling, so a tap or a sideways swipe keeps
      // its default behaviour.
      if (travel > 4 && event.cancelable) event.preventDefault();
    };

    const onEnd = () => {
      if (startY.current === null) return;
      const reached = distance.current >= THRESHOLD;
      startY.current = null;
      distance.current = 0;
      setDragging(false);
      // Released either way: the band lets go now, and while the refresh is in
      // flight the indicator is held open by `pending` instead. That keeps the
      // reset in the event that caused it, rather than in an effect watching
      // for it to be over.
      setPull(0);

      if (reached) startTransition(() => router.refresh());
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  if (pull === 0 && !pending) return null;

  const offset = pending ? THRESHOLD : pull;
  const ready = offset >= THRESHOLD;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center"
      style={{
        // No transition while the finger is down — the indicator should track
        // the hand exactly. It eases only on the way back.
        transform: `translateY(${Math.max(0, offset - 34)}px)`,
        transition: dragging ? "none" : "transform 220ms ease-out",
      }}
    >
      <div
        // The hairline matters: the card colour is near-white on a near-white
        // canvas, and without an edge the chip vanishes and Pip looks like he
        // is floating loose over the page.
        className={`mt-2 grid size-12 place-items-center rounded-full border border-border bg-card shadow-[var(--shadow-pop)] transition-opacity ${
          ready ? "opacity-100" : "opacity-70"
        }`}
      >
        <Pip
          burn={ready ? 1 : Math.min(0.9, offset / THRESHOLD)}
          className={pending ? "pull-refresh-pip" : ""}
          mood={ready ? "lifting" : "grounded"}
          seed={0}
          size={30}
        />
      </div>
      <span className="sr-only" role="status">
        {pending ? "Refreshing" : ready ? "Release to refresh" : "Pull to refresh"}
      </span>
    </div>
  );
}
