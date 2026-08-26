"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Pip } from "@/components/brand/Pip";

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
      className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(255,79,163,0.12),transparent_30%),var(--background)] p-5 text-foreground"
      id="main-content"
      tabIndex={-1}
    >
      <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] w-full max-w-lg rounded-2xl p-7 text-center sm:p-9">
        {/* Engine off, feet down: the honest picture of a page that did not
            load, and better company than an exclamation mark. */}
        <Pip burn={0} className="mx-auto" mood="grounded" seed={13} size={68} />
        <p className="label-caps mt-6 text-tasks-ink">Orbit paused</p>
        <h1 className="mt-3 text-[28px] font-semibold text-foreground">
          This page couldn&apos;t load.
        </h1>
        <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
          Your data is safe. Retry the request, or return to the Overview if the
          connection is still unavailable.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            className="min-h-11 rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground"
            onClick={unstable_retry}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-[rgba(244,235,221,0.1)] bg-[rgba(244,235,221,0.04)] px-5 py-2.5 text-[13px] font-semibold text-foreground"
            href="/"
          >
            Go to Overview
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-5 font-mono text-[12px] text-muted-foreground">
            Reference {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
