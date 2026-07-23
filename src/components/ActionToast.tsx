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
        className={`action-toast floating-panel pointer-events-auto flex w-full items-center justify-between gap-4 rounded-[var(--radius-row)] px-4 py-3 text-[13px] shadow-2xl ${
          tone === "error"
            ? "border-[color-mix(in_srgb,var(--danger)_34%,transparent)] text-[var(--danger-text)]"
            : "text-white"
        }`}
        role={tone === "error" ? "alert" : "status"}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
              tone === "error"
                ? "bg-[var(--danger)] text-[#3b0908]"
                : tone === "loading"
                  ? "bg-[var(--accent-info)]/15 text-[var(--info-text)]"
                  : "bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
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
