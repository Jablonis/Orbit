import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { ensureFitnessPlan, getFitnessStats } from "@/lib/fitness";
import { getDateInTimeZone } from "@/lib/tasks";
import { FitnessClient } from "./FitnessClient";

export const dynamic = "force-dynamic";

export default async function FitnessPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const today = getDateInTimeZone();
  const weeklyPlan = await ensureFitnessPlan(supabase, user.id, today);
  const stats = getFitnessStats(weeklyPlan, today);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0d0e] pb-12 text-[#e5e2e1] md:pl-[112px]">
      <AppNavigation active="fitness" userEmail={user.email ?? "Orbit user"} />
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
