import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { ensureFitnessPlan, getFitnessStats } from "@/lib/fitness";
import { getFitnessProfile } from "@/lib/fitness-setup";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import { FitnessClient } from "./FitnessClient";
import { FitnessSetupForm } from "./FitnessSetupForm";
import { WatchLink } from "@/components/fitness/WatchLink";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fitness",
};

export default async function FitnessPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const [weeklyPlan, fitnessProfile] = await Promise.all([
    ensureFitnessPlan(
      supabase,
      user.id,
      today,
      preferences.regional.weekStartsOn,
    ),
    getFitnessProfile(supabase, user.id),
  ]);

  // Only that a token exists and when it was last used — the token itself is
  // stored as a hash and cannot be read back, here or anywhere.
  const { data: watch } = await supabase
    .from("ingest_tokens")
    .select("created_at,last_used_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const asDay = (value: string | null | undefined) =>
    value ? getDateInTimeZone(value, preferences.regional.timeZone) : null;
  // Built from the request rather than an env var, so the Shortcut recipe on
  // screen names the host you are actually looking at.
  const host = (await headers()).get("host") ?? "";
  const origin = host ? `https://${host}` : "";

  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation active="fitness"
        theme={theme} profile={preferences.regional} userEmail={user.email ?? "Orbit user"} />
      {weeklyPlan ? (
        <>
          <FitnessClient
            key={weeklyPlan
              .map((day) => `${day.date}:${day.sport}:${day.log.completed}`)
              .join("|")}
            stats={getFitnessStats(weeklyPlan, today)}
            weeklyPlan={weeklyPlan}
          />
          <section className="page-container pb-10">
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl border border-border px-4 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                Training setup
                <span aria-hidden="true" className="group-open:rotate-45">＋</span>
              </summary>
              <div className="mt-4">
                <FitnessSetupForm
                  compact
                  existingPlan
                  profile={fitnessProfile}
                />
                <WatchLink
                  connectedOn={asDay(watch?.created_at)}
                  lastUsedOn={asDay(watch?.last_used_at)}
                  origin={origin}
                />
              </div>
            </details>
          </section>
        </>
      ) : (
        <section className="page-container py-8">
          <header className="mb-7 pr-14 md:pr-0">
            <p className="label-caps text-primary">
              Fitness setup
            </p>
            <h1 className="page-title mt-2 text-foreground">
              Choose how you want to train
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
              No plan is active. Confirm a reviewed starter setup before Orbit
              schedules or describes any training.
            </p>
          </header>
          <FitnessSetupForm profile={fitnessProfile} />
        </section>
      )}
    </main>
  );
}
