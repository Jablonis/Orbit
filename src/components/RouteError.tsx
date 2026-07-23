"use client";

import { useEffect } from "react";
import Link from "next/link";

export function RouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Orbit route error", error);
  }, [error]);

  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(255,79,163,0.12),transparent_30%),var(--canvas)] p-5 text-[var(--text-primary)]"
      id="main-content"
      tabIndex={-1}
    >
      <section className="glass-panel w-full max-w-lg rounded-[28px] p-7 text-center sm:p-9">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--danger)]/25 bg-[var(--danger)]/10 text-[22px] text-[var(--danger-text)]">
          !
        </div>
        <p className="label-caps mt-6 text-[#ff9fca]">Orbit paused</p>
        <h1 className="mt-3 text-[28px] font-semibold text-white">
          This page couldn&apos;t load.
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
          Your data is safe. Retry the request, or return to the Overview if the
          connection is still unavailable.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            className="min-h-11 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[var(--text-on-light)]"
            onClick={unstable_retry}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-[13px] font-semibold text-white"
            href="/"
          >
            Go to Overview
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-5 font-mono text-[12px] text-[var(--text-muted)]">
            Reference {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
