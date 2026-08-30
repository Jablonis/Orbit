"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pip } from "@/components/brand/Pip";

type Tone = "error" | "loading" | "success";

/**
 * The audit's finding on this component: no auto-dismiss and no keying, so a
 * toast stayed on screen forever and a repeat of the same message showed
 * nothing at all. The outer component re-keys the body on every new
 * message+tone, which restarts the clock and resets the dismissal without a
 * single "set state when props change" effect — a fresh mount has no stale
 * state to clear.
 */
export function ActionToast(props: {
  action?: ReactNode;
  message: string;
  tone?: Tone;
}) {
  return <ToastBody key={`${props.tone ?? "success"}:${props.message}`} {...props} />;
}

function ToastBody({
  action,
  message,
  tone = "success",
}: {
  action?: ReactNode;
  message: string;
  tone?: Tone;
}) {
  const [dismissed, setDismissed] = useState(false);

  // Success has been read in four seconds; an error earns longer, because it
  // is the one worth writing down. Loading stays until it is replaced.
  useEffect(() => {
    if (tone === "loading") return;
    const timer = setTimeout(
      () => setDismissed(true),
      tone === "error" ? 8000 : 4200,
    );
    return () => clearTimeout(timer);
  }, [tone]);

  if (dismissed) return null;
  if (typeof document === "undefined") return null;

  const toast = (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[160] flex justify-center md:bottom-6 md:left-[calc(50%+56px)] md:right-auto md:w-[min(440px,calc(100vw-9rem))] md:-translate-x-1/2"
    >
      <div
        aria-live={tone === "error" ? "assertive" : "polite"}
        className={`action-toast rounded-2xl bg-popover shadow-[var(--shadow-pop)] pointer-events-auto flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-[13px] shadow-2xl ${
          tone === "error"
            ? "border-[color-mix(in_srgb,var(--destructive)_34%,transparent)] text-destructive"
            : "text-foreground"
        }`}
        role={tone === "error" ? "alert" : "status"}
      >
        <span className="flex min-w-0 items-center gap-2">
          {/* A tick tells you the request finished. Pip with his flippers up
              tells you it worked, which is the same fact and a better one to
              be handed. Failure keeps the plain mark: this is not the moment
              for a character. */}
          {tone === "success" ? (
            <Pip
              burn={1}
              className="h-7 w-auto shrink-0"
              mood="sealed"
              seed={2}
              size={28}
            />
          ) : (
            <span
              aria-hidden="true"
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                tone === "error"
                  ? "bg-destructive text-primary-foreground"
                  : "bg-finance/15 text-finance-ink"
              }`}
            >
              {tone === "loading" ? (
                <span className="action-toast-spinner h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent" />
              ) : (
                "!"
              )}
            </span>
          )}
          <span className="min-w-0 leading-5">{message}</span>
        </span>
        {action}
      </div>
    </div>
  );

  return createPortal(toast, document.body);
}
