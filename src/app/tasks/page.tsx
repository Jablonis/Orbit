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
  const { supabase, user } = await getAuthenticatedUser();
  const today = getDateInTimeZone();
  const taskHistory = await getTasks(supabase, user.id, { includeHistory: true });
  const tasks = getVisibleTasks(taskHistory, today);
  const stats = getTaskStats(tasks);
  const categorySuggestions = getMostUsedTaskCategories(taskHistory);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0d0e] pb-[calc(7rem+env(safe-area-inset-bottom))] text-[#e5e2e1] md:pb-12 md:pl-[112px]">
      <AppNavigation active="tasks" userEmail={user.email ?? "Orbit user"} />
      <TasksClient
        categorySuggestions={categorySuggestions}
        stats={stats}
        tasks={tasks}
        today={today}
      />
    </main>
  );
}
