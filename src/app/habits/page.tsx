import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { shiftDate } from "@/lib/fitness";
import { getHabitChecks, getHabitHold, getHabits, isHabitDoneOn } from "@/lib/habits";
import {
  defaultDashboardPreferences,
  getDashboardPreferences,
} from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import { HabitsClient } from "./HabitsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Habits",
};

/**
 * Everything this page needs, and never a throw.
 *
 * A server component that throws in production does not get to say why: Next
 * redacts the message and hands the visitor an opaque reference number, which
 * is exactly what happened here twice. So the whole load is caught, and
 * whatever went wrong is carried into the page as a sentence the person
 * looking at it can read and repeat.
 */
async function loadHabits() {
  const { supabase, user } = await getAuthenticatedUser();

  try {
    const preferences = await getDashboardPreferences(supabase, user.id);
    const timeZone = preferences.regional.timeZone;
    const today = getDateInTimeZone(new Date(), timeZone);
    // Four weeks: enough to say whether a habit is actually being held, and
    // little enough that it costs one small query. The same window a routine
    // is judged over, so the two cannot disagree.
    const holdWindow = Array.from({ length: 28 }, (_, index) =>
      shiftDate(today, index - 27),
    );
    const [habitRead, checkRead] = await Promise.all([
      getHabits(supabase, user.id),
      getHabitChecks(supabase, user.id, holdWindow[0], today),
    ]);

    return {
      checks: checkRead.rows,
      habits: habitRead.rows,
      holdWindow,
      preferences,
      timeZone,
      today,
      // Said out loud rather than shown as an empty list. A page that cannot
      // read its own table and draws "nothing yet" is lying to the reader.
      trouble: habitRead.error || checkRead.error,
      user,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("habits: page load failed", reason);
    const preferences = defaultDashboardPreferences;
    const timeZone = preferences.regional.timeZone;
    const today = getDateInTimeZone(new Date(), timeZone);

    return {
      checks: [],
      habits: [],
      holdWindow: [today],
      preferences,
      timeZone,
      today,
      trouble: reason,
      user,
    };
  }
}

export default async function HabitsPage() {
  const {
    checks,
    habits,
    holdWindow,
    preferences,
    timeZone,
    today,
    trouble,
    user,
  } = await loadHabits();
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
