import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OrbitWordmark } from "@/components/BrandMark";
import { getSafeReturnPath } from "@/lib/auth-return";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    recovery?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const nextPath = getSafeReturnPath(query.next);
  let isAuthenticated = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    isAuthenticated = Boolean(data?.claims);
  } catch {
    isAuthenticated = false;
  }

  if (isAuthenticated) {
    redirect(nextPath);
  }

  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_18%_12%,rgba(167,139,250,0.2),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(163,230,53,0.14),transparent_28%),var(--background)] px-4 text-foreground"
      id="main-content"
      tabIndex={-1}
    >
      <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] w-full max-w-[460px] rounded-2xl p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
        <div className="mb-8">
          <Link aria-label="About Orbit" className="inline-flex" href="/welcome">
            <OrbitWordmark size={26} />
          </Link>
          <h1 className="mt-3 text-[34px] font-semibold leading-[40px] text-foreground">
            Sign in to your dashboard
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
            Your tasks, training plan and finance data are stored per account.
          </p>
        </div>
        {query.recovery === "complete" ? (
          <p
            className="mb-5 rounded-xl border border-[color-mix(in_srgb,var(--fitness)_30%,transparent)] bg-[color-mix(in_srgb,var(--fitness)_9%,transparent)] p-3 text-[13px] text-fitness-ink"
            role="status"
          >
            Password updated. Sign in with your new password.
          </p>
        ) : query.recovery === "expired" ? (
          <p
            className="mb-5 rounded-xl border border-[color-mix(in_srgb,var(--destructive)_30%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_9%,transparent)] p-3 text-[13px] text-destructive"
            role="alert"
          >
            That recovery link is invalid or expired. Request a new one.
          </p>
        ) : null}
        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
