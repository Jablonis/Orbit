import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPreferences } from "@/lib/preferences";
import {
  getDateInTimeZone,
  getTaskDayStatus,
  getTasks,
  getVisibleTasks,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

/**
 * What is actually wrong, from inside the account.
 *
 * Three failures in a row came back as opaque reference numbers, because a
 * server component that throws in production does not get to say why and a
 * platform error page says less than that. Guessing from the outside cost more
 * time than the features did.
 *
 * So: one authenticated endpoint that asks the database the questions directly
 * and reports the answers, including the error codes verbatim. It reads and
 * never writes, it returns only the caller's own rows, and it is reachable only
 * with a session — the same door every other page uses.
 */

type Probe = { detail?: string; name: string; ok: boolean };

async function probe(name: string, run: () => Promise<unknown>): Promise<Probe> {
  try {
    const result = (await run()) as { error?: { code?: string; message?: string } };
    if (result?.error) {
      return {
        detail: `${result.error.code ?? "?"}: ${result.error.message ?? ""}`.trim(),
        name,
        ok: false,
      };
    }
    return { name, ok: true };
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      name,
      ok: false,
    };
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const preferences = await getDashboardPreferences(supabase, user.id);
  const timeZone = preferences.regional.timeZone;
  const today = getDateInTimeZone(new Date(), timeZone);

  const probes = await Promise.all([
    probe("read habits", async () =>
      supabase.from("habits").select("id").eq("user_id", user.id).limit(1),
    ),
    probe("read habit_checks", async () =>
      supabase.from("habit_checks").select("habit_id").eq("user_id", user.id).limit(1),
    ),
    // Deliberately invalid arguments: this asks whether the function exists and
    // is callable, and a validation error back from inside it is a pass. It
    // writes nothing.
    probe("call save_habit", async () => {
      const { error } = await supabase.rpc("save_habit", {
        p_id: null,
        p_name: "",
        p_repeat_days: [],
      });
      // 22023 is the function's own "a habit needs a name", which means it ran.
      return { error: error?.code === "22023" ? undefined : error };
    }),
    probe("call set_habit_check", async () => {
      const { error } = await supabase.rpc("set_habit_check", {
        p_date: today,
        p_done: false,
        p_habit_id: "00000000-0000-0000-0000-000000000000",
      });
      // P0002 is "habit not found", which also means it ran.
      return { error: error?.code === "P0002" ? undefined : error };
    }),
    probe("read tasks.repeat_days", async () =>
      supabase.from("tasks").select("repeat_days").eq("user_id", user.id).limit(1),
    ),
  ]);

  // Why a task is or is not on the Overview, task by task, using the same
  // functions the Overview uses rather than a second opinion.
  let tasks: unknown = "unavailable";
  try {
    const history = await getTasks(supabase, user.id, { includeHistory: true });
    const visible = new Set(
      getVisibleTasks(history, today, timeZone).map((task) => task.id),
    );
    tasks = {
      newest: history.slice(0, 5).map((task) => ({
        category: task.category,
        createdAt: task.createdAt,
        dueDate: task.dueDate || null,
        onOverview:
          visible.has(task.id) &&
          ["today", "completed"].includes(getTaskDayStatus(task, today, timeZone)) &&
          (!preferences.pinnedTaskCategory ||
            task.category.toLocaleLowerCase() ===
              preferences.pinnedTaskCategory.toLocaleLowerCase()),
        repeatDays: task.repeatDays,
        status: getTaskDayStatus(task, today, timeZone),
        title: task.title,
        visibleToday: visible.has(task.id),
      })),
      total: history.length,
    };
  } catch (error) {
    tasks = { error: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json(
    {
      account: {
        // A category pinned here hides every task that is not in it from the
        // Overview, which looks exactly like new tasks not appearing.
        pinnedTaskCategory: preferences.pinnedTaskCategory || null,
        timeZone,
        today,
      },
      probes,
      tasks,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
