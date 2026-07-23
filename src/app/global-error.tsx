"use client";

import Link from "next/link";
import "./globals.css";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Orbit encountered an error</title>
      </head>
      <body className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] antialiased">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <main
          className="grid min-h-[100dvh] place-items-center px-4 py-12"
          id="main-content"
          tabIndex={-1}
        >
          <section className="w-full max-w-xl rounded-[24px] border border-white/10 bg-[var(--surface-1)] p-7 text-center shadow-2xl sm:p-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#ff9f9f]">
              Orbit interrupted
            </p>
            <h1 className="mt-4 text-[36px] font-semibold leading-tight text-white sm:text-[44px]">
              Something went wrong.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-6 text-[var(--text-secondary)]">
              Your saved data has not been shown here. Try loading the current
              view again, or return to Overview.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                className="min-h-11 rounded-[12px] bg-[var(--accent-primary)] px-5 text-[13px] font-bold text-[var(--text-on-accent)]"
                onClick={() => unstable_retry()}
                type="button"
              >
                Try again
              </button>
              <Link
                className="inline-flex min-h-11 items-center rounded-[12px] border border-white/10 px-5 text-[13px] font-semibold text-white"
                href="/"
              >
                Return to Overview
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
