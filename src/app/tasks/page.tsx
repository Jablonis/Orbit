import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getDateInTimeZone,
  getMostUsedTaskCategories,
  getTaskStats,
  getTasks,
  getVisibleTasks,
} from "@/lib/tasks";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { supabase } = await getAuthenticatedUser();
  const today = getDateInTimeZone();
  const taskHistory = await getTasks(supabase, { includeHistory: true });
  const tasks = getVisibleTasks(taskHistory, today);
  const stats = getTaskStats(tasks);
  const categorySuggestions = getMostUsedTaskCategories(taskHistory);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0d0e] pb-12 text-[#e5e2e1] md:pl-[112px]">
      <AppNavigation active="tasks" />
      <TasksClient
        categorySuggestions={categorySuggestions}
        stats={stats}
        tasks={tasks}
        today={today}
      />
    </main>
  );
}
