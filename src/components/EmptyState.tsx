import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState({
  action,
  actionHref,
  actionLabel,
  description,
  icon = "○",
  title,
}: {
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon?: string;
  title: string;
}) {
  return (
    <div className="grid min-h-44 place-items-center rounded-[var(--radius-row)] border border-dashed border-[var(--border-strong)] bg-white/[0.018] p-6 text-center">
      <div className="max-w-sm">
        <span aria-hidden="true" className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white/[0.055] text-[18px] text-[var(--text-secondary)]">
          {icon}
        </span>
        <p className="mt-3 text-[15px] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[12px] leading-[18px] text-[var(--text-tertiary)]">{description}</p>
        {action ? <div className="mt-4">{action}</div> : actionHref && actionLabel ? (
          <Link
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white/[0.045] px-4 text-[12px] font-semibold text-white transition duration-150 hover:bg-white/[0.08]"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
