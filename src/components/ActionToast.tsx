import type { ReactNode } from "react";

export function ActionToast({
  action,
  message,
  tone = "success",
}: {
  action?: ReactNode;
  message: string;
  tone?: "error" | "success";
}) {
  return (
    <div
      className={`action-toast floating-panel fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 z-[120] flex w-[min(92vw,440px)] -translate-x-1/2 items-center justify-between gap-4 rounded-[var(--radius-row)] px-4 py-3 text-[13px] shadow-2xl md:bottom-6 md:left-[calc(50%+56px)] ${tone === "success" ? "text-white" : "border-[color-mix(in_srgb,var(--danger)_34%,transparent)] text-[#ffd7d3]"}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${tone === "success" ? "bg-[var(--accent-primary)] text-[#14200a]" : "bg-[var(--danger)] text-[#3b0908]"}`}>
          {tone === "success" ? "✓" : "!"}
        </span>
        <span>{message}</span>
      </span>
      {action}
    </div>
  );
}
