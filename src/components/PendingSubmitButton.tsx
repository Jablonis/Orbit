"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  ariaLabel,
  children,
  className,
  pendingLabel = "Working…",
}: {
  ariaLabel?: string;
  children: ReactNode;
  className: string;
  pendingLabel?: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      aria-disabled={pending}
      aria-label={ariaLabel}
      className={`${className} ${pending ? "pending-button-state" : ""} disabled:cursor-wait disabled:opacity-70`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
