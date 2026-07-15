import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { getTaskStats, getTasks } from "@/lib/tasks";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { supabase } = await getAuthenticatedUser();
  const tasks = await getTasks(supabase);
  const stats = getTaskStats(tasks);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0d0e] pb-12 text-[#e5e2e1] md:pl-[112px]">
      <AppNavigation active="tasks" />
      <TasksClient stats={stats} tasks={tasks} />
    </main>
  );
}
