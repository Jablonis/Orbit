import Link from "next/link";
import type { Metadata } from "next";
import { getSafeReturnPath } from "@/lib/auth-return";
import { PasswordResetRequestForm } from "./PasswordResetRequestForm";

export const metadata: Metadata = { title: "Recover account" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const nextPath = getSafeReturnPath((await searchParams).next);

  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[var(--canvas)] px-4 py-10 text-[var(--text-primary)]"
      id="main-content"
      tabIndex={-1}
    >
      <section className="surface-overlay w-full max-w-[460px] rounded-[var(--radius-panel)] p-6 shadow-[var(--shadow-overlay)]">
        <p className="label-caps text-[var(--accent-primary)]">Orbit recovery</p>
        <h1 className="mt-3 text-[32px] font-semibold text-white">
          Reset your password
        </h1>
        <p className="mb-6 mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
          We will send a time-limited link to the email on your account.
        </p>
        <PasswordResetRequestForm nextPath={nextPath} />
        <Link
          className="mt-6 inline-flex min-h-11 items-center text-[13px] font-semibold text-[var(--accent-primary)]"
          href={`/login?next=${encodeURIComponent(nextPath)}`}
        >
          ← Back to sign in
        </Link>
      </section>
    </main>
  );
}
