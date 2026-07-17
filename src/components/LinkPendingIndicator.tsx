"use client";

import { useLinkStatus } from "next/link";

export function LinkPendingIndicator({ label = "Loading" }: { label?: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span
        aria-hidden="true"
        className={`link-pending-indicator ${pending ? "is-pending" : ""}`}
      />
      <span aria-live="polite" className="sr-only">
        {pending ? label : ""}
      </span>
    </>
  );
}
