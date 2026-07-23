import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDashboardPreferences } from "@/lib/preferences";
import {
  getDateInTimeZone,
  getArchivedTasks,
  getMostUsedTaskCategories,
  getTaskStats,
  getTasks,
  getVisibleTasks,
} from "@/lib/tasks";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tasks",
};

export default async function TasksPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const [taskHistory, archivedTasks] = await Promise.all([
    getTasks(supabase, user.id, { includeHistory: true }),
    getArchivedTasks(supabase, user.id),
  ]);
  const tasks = getVisibleTasks(taskHistory, today);
  const stats = getTaskStats(tasks);
  const categorySuggestions = getMostUsedTaskCategories(taskHistory);

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation active="tasks" profile={preferences.regional} userEmail={user.email ?? "Orbit user"} />
      <TasksClient
        archivedTasks={archivedTasks}
        categorySuggestions={categorySuggestions}
        stats={stats}
        tasks={tasks}
        today={today}
        locale={preferences.regional.locale}
      />
    </main>
  );
}
