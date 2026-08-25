"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export function ActionToast({
  action,
  message,
  tone = "success",
}: {
  action?: ReactNode;
  message: string;
  tone?: "error" | "loading" | "success";
}) {
  if (typeof document === "undefined") return null;

  const toast = (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[160] flex justify-center md:bottom-6 md:left-[calc(50%+56px)] md:right-auto md:w-[min(440px,calc(100vw-9rem))] md:-translate-x-1/2"
    >
      <div
        aria-live={tone === "error" ? "assertive" : "polite"}
        className={`action-toast rounded-2xl bg-popover shadow-[0_24px_60px_-30px_rgba(27,26,31,0.35)] pointer-events-auto flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-[13px] shadow-2xl ${
          tone === "error"
            ? "border-[color-mix(in_srgb,var(--destructive)_34%,transparent)] text-destructive"
            : "text-foreground"
        }`}
        role={tone === "error" ? "alert" : "status"}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
              tone === "error"
                ? "bg-destructive text-primary-foreground"
                : tone === "loading"
                  ? "bg-finance/15 text-finance-ink"
                  : "bg-primary text-primary-foreground"
            }`}
          >
            {tone === "loading" ? (
              <span className="action-toast-spinner h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent" />
            ) : tone === "success" ? "✓" : "!"}
          </span>
          <span className="min-w-0 leading-5">{message}</span>
        </span>
        {action}
      </div>
    </div>
  );

  return createPortal(toast, document.body);
}
