import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { shiftDate } from "@/lib/fitness";
import { getHabitChecks, getHabitHold, getHabits, isHabitDoneOn } from "@/lib/habits";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import { HabitsClient } from "./HabitsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Habits",
};

export default async function HabitsPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const timeZone = preferences.regional.timeZone;
  const today = getDateInTimeZone(new Date(), timeZone);
  // Four weeks: enough to say whether a habit is actually being held, and
  // little enough that it costs one small query. The same window a routine is
  // judged over, so the two cannot disagree.
  const holdWindow = Array.from({ length: 28 }, (_, index) =>
    shiftDate(today, index - 27),
  );
  const [habitRead, checkRead] = await Promise.all([
    getHabits(supabase, user.id),
    getHabitChecks(supabase, user.id, holdWindow[0], today),
  ]);
  const habits = habitRead.rows;
  const checks = checkRead.rows;
  // Said out loud rather than shown as an empty list. A page that cannot read
  // its own table and draws "nothing yet" is lying to the person reading it.
  const trouble = habitRead.error || checkRead.error;
  const doneToday = habits
    .filter((habit) => isHabitDoneOn(checks, habit.id, today))
    .map((habit) => habit.id);
  const holds = Object.fromEntries(
    habits.map((habit) => [
      habit.id,
      getHabitHold(habit, checks, holdWindow, timeZone),
    ]),
  );

  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation
        active="habits"
        profile={preferences.regional}
        theme={theme}
        userEmail={user.email ?? "Orbit user"}
      />
      <HabitsClient
        doneToday={doneToday}
        habits={habits}
        holds={holds}
        timeZone={timeZone}
        today={today}
        trouble={trouble}
      />
    </main>
  );
}
