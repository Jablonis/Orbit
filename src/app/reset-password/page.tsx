import type { Metadata } from "next";
import { getSafeReturnPath } from "@/lib/auth-return";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const nextPath = getSafeReturnPath((await searchParams).next);
  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-background px-4 py-10 text-foreground"
      id="main-content"
      tabIndex={-1}
    >
      <section className="surface-overlay w-full max-w-[460px] rounded-2xl p-6 shadow-[var(--shadow-pop)]">
        <p className="label-caps text-primary">Orbit recovery</p>
        <h1 className="mt-3 text-[32px] font-semibold text-foreground">
          Choose a new password
        </h1>
        <p className="mb-6 mt-3 text-[14px] leading-6 text-muted-foreground">
          Use at least 8 characters. Your recovery session ends after the
          password is updated.
        </p>
        <ResetPasswordForm nextPath={nextPath} />
      </section>
    </main>
  );
}
