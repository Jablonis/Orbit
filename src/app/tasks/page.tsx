import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDashboardPreferences } from "@/lib/preferences";
import {
  getDateInTimeZone,
  getArchivedTasks,
  getMostUsedTaskCategories,
  getTaskCompletions,
  getTaskStats,
  getTasks,
  getVisibleTasks,
  isRepeating,
} from "@/lib/tasks";
import { getRoutineHold, isRoutineDoneOn } from "@/lib/routines";
import { shiftDate } from "@/lib/fitness";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tasks",
};

export default async function TasksPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  // Four weeks is enough to say whether a routine is actually being held, and
  // little enough that it costs one small query.
  const holdWindow = Array.from({ length: 28 }, (_, index) =>
    shiftDate(today, index - 27),
  );
  const [taskHistory, archivedTasks, completions] = await Promise.all([
    getTasks(supabase, user.id, { includeHistory: true }),
    getArchivedTasks(supabase, user.id),
    getTaskCompletions(supabase, user.id, holdWindow[0], shiftDate(today, 1)),
  ]);
  const tasks = getVisibleTasks(
    taskHistory,
    today,
    preferences.regional.timeZone,
  );
  const stats = getTaskStats(tasks);
  const routines = taskHistory.filter(isRepeating);
  const doneToday = routines
    .filter((task) => isRoutineDoneOn(completions, task.id, today))
    .map((task) => task.id);
  const holds = Object.fromEntries(
    routines.map((task) => [
      task.id,
      getRoutineHold(task, completions, holdWindow, preferences.regional.timeZone),
    ]),
  );
  const categorySuggestions = getMostUsedTaskCategories(taskHistory);

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation active="tasks" profile={preferences.regional} userEmail={user.email ?? "Orbit user"} />
      <TasksClient
        archivedTasks={archivedTasks}
        categorySuggestions={categorySuggestions}
        doneToday={doneToday}
        hasRoutines={routines.length > 0}
        holds={holds}
        stats={stats}
        tasks={tasks}
        today={today}
        locale={preferences.regional.locale}
        timeZone={preferences.regional.timeZone}
      />
    </main>
  );
}
