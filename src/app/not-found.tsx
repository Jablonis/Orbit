import Link from "next/link";
import { Pip } from "@/components/brand/Pip";

export default function NotFound() {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-background px-4 py-12 text-foreground"
      id="main-content"
      tabIndex={-1}
    >
      <section className="rounded-2xl bg-card shadow-[var(--shadow-card)] w-full max-w-xl rounded-2xl p-7 text-center sm:p-10">
        {/* Off course is a place, and someone is out there in it. */}
        <Pip burn={0.5} className="mx-auto" mood="lifting" seed={14} size={72} />
        <p className="label-caps mt-5 text-finance">404 · Off course</p>
        <h1 className="editorial-display mt-4 text-[38px] leading-tight text-foreground sm:text-[48px]">
          This orbit does not exist.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14px] leading-6 text-muted-foreground">
          The page may have moved, or the address may be incomplete. Return to
          Overview to continue with your current day.
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-[13px] font-bold text-primary-foreground"
          href="/"
        >
          Return to Overview
        </Link>
      </section>
    </main>
  );
}
