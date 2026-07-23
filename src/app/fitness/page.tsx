import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { ensureFitnessPlan, getFitnessStats } from "@/lib/fitness";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import { FitnessClient } from "./FitnessClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fitness",
};

export default async function FitnessPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const weeklyPlan = await ensureFitnessPlan(supabase, user.id, today);
  const stats = getFitnessStats(weeklyPlan, today);

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation active="fitness" profile={preferences.regional} userEmail={user.email ?? "Orbit user"} />
      <FitnessClient
        key={weeklyPlan
          .map((day) => `${day.date}:${day.sport}:${day.log.completed}`)
          .join("|")}
        stats={stats}
        weeklyPlan={weeklyPlan}
      />
    </main>
  );
}
