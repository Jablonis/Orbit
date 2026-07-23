import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[var(--canvas)] px-4 py-12 text-[var(--text-primary)]"
      id="main-content"
      tabIndex={-1}
    >
      <section className="content-panel w-full max-w-xl rounded-[var(--radius-panel)] p-7 text-center sm:p-10">
        <p className="label-caps text-[var(--accent-info)]">404 · Off course</p>
        <h1 className="editorial-display mt-4 text-[38px] leading-tight text-white sm:text-[48px]">
          This orbit does not exist.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14px] leading-6 text-[var(--text-secondary)]">
          The page may have moved, or the address may be incomplete. Return to
          Overview to continue with your current day.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-primary)] px-5 text-[13px] font-bold text-[var(--text-on-accent)]"
          href="/"
        >
          Return to Overview
        </Link>
      </section>
    </main>
  );
}
