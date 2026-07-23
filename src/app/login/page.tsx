import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  let isAuthenticated = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    isAuthenticated = Boolean(data?.claims);
  } catch {
    isAuthenticated = false;
  }

  if (isAuthenticated) {
    redirect("/");
  }

  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_18%_12%,rgba(167,139,250,0.2),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(163,230,53,0.14),transparent_28%),var(--canvas)] px-4 text-[var(--text-primary)]"
      id="main-content"
      tabIndex={-1}
    >
      <section className="glass-panel w-full max-w-[460px] rounded-[24px] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
        <div className="mb-8">
          <p className="label-caps text-[var(--accent-primary)]">Orbit</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[40px] text-white">
            Sign in to your dashboard
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
            Your tasks, training plan and finance data are stored per account.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
