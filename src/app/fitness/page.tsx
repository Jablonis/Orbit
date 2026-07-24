import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { ensureFitnessPlan, getFitnessStats } from "@/lib/fitness";
import { getFitnessProfile } from "@/lib/fitness-setup";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import { FitnessClient } from "./FitnessClient";
import { FitnessSetupForm } from "./FitnessSetupForm";

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

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation active="fitness" profile={preferences.regional} userEmail={user.email ?? "Orbit user"} />
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
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-white">
                Training setup
                <span aria-hidden="true" className="group-open:rotate-45">＋</span>
              </summary>
              <div className="mt-4">
                <FitnessSetupForm
                  compact
                  existingPlan
                  profile={fitnessProfile}
                />
              </div>
            </details>
          </section>
        </>
      ) : (
        <section className="page-container py-8">
          <header className="mb-7 pr-14 md:pr-0">
            <p className="label-caps text-[var(--accent-primary)]">
              Fitness setup
            </p>
            <h1 className="page-title mt-2 text-white">
              Choose how you want to train
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
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
