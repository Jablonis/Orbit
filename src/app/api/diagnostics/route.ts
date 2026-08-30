import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  defaultDashboardPreferences,
  getDashboardPreferences,
} from "@/lib/preferences";
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
 * Repeated failures came back as opaque reference numbers, because a server
 * component that throws in production does not get to say why. Guessing from
 * the outside cost more time than the features did, so this asks the database
 * every question the app ever asks it and reports the answers verbatim.
 *
 * It reads and never writes. Functions that would write on valid input are
 * probed with arguments their own validation rejects, so a validation error
 * back from inside the function is a PASS: it proves the function exists, is
 * granted, and runs. The expected code is written beside each probe.
 *
 * The first version called `getDashboardPreferences` outside any guard, so
 * the endpoint 500ed on exactly the class of failure it exists to diagnose.
 * Everything here is now allowed to fail individually and loudly.
 */

type Probe = { detail?: string; name: string; ok: boolean };

type Rejection = { code?: string; message?: string };

async function probe(name: string, run: () => Promise<unknown>): Promise<Probe> {
  try {
    const result = (await run()) as { error?: Rejection | null };
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

/**
 * An RPC probed with deliberately invalid arguments: the listed codes are the
 * function's own validation refusing them, which means it ran. `P0001` is a
 * plpgsql `raise exception` without an explicit errcode.
 */
function rpcProbe(
  name: string,
  run: () => PromiseLike<{ error: Rejection | null }>,
  passCodes: string[],
) {
  return probe(name, async () => {
    const { error } = await run();
    if (error && passCodes.includes(error.code ?? "")) return { error: null };
    return { error };
  });
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

  let preferences = defaultDashboardPreferences;
  let preferencesProbe: Probe = { name: "preferences: read profile", ok: true };
  try {
    preferences = await getDashboardPreferences(supabase, user.id);
  } catch (error) {
    preferencesProbe = {
      detail: error instanceof Error ? error.message : String(error),
      name: "preferences: read profile",
      ok: false,
    };
  }
  const timeZone = preferences.regional.timeZone;
  const today = getDateInTimeZone(new Date(), timeZone);
  const noRow = "00000000-0000-0000-0000-000000000000";
  const read = (table: string, columns: string) =>
    probe(`${table}: read`, async () =>
      supabase.from(table).select(columns).eq("user_id", user.id).limit(1),
    );

  const probes = await Promise.all([
    Promise.resolve(preferencesProbe),

    // -- tasks & routines ---------------------------------------------------
    probe("tasks: read repeat_days", async () =>
      supabase.from("tasks").select("repeat_days").eq("user_id", user.id).limit(1),
    ),
    read("task_completions", "task_id"),
    rpcProbe(
      "rpc set_routine_completion",
      () =>
        supabase.rpc("set_routine_completion", {
          p_date: null,
          p_done: false,
          p_task_id: null,
        }),
      ["22023"],
    ),

    // -- habits -------------------------------------------------------------
    read("habits", "id"),
    read("habit_checks", "habit_id"),
    rpcProbe(
      "rpc save_habit",
      () => supabase.rpc("save_habit", { p_id: null, p_name: "", p_repeat_days: [] }),
      ["22023"],
    ),
    rpcProbe(
      "rpc set_habit_check",
      () =>
        supabase.rpc("set_habit_check", {
          p_date: today,
          p_done: false,
          p_habit_id: noRow,
        }),
      ["P0002"],
    ),

    // -- fitness ------------------------------------------------------------
    read("fitness_plan_days", "weekday"),
    read("fitness_plan_versions", "effective_from"),
    read("fitness_sessions", "performed_on"),
    read("fitness_profiles", "user_id"),
    rpcProbe(
      "rpc set_fitness_plan_day",
      () =>
        supabase.rpc("set_fitness_plan_day", {
          p_effective_from: null,
          p_sport: "nope",
          p_weekday: "nope",
        }),
      ["22023"],
    ),
    rpcProbe(
      "rpc replace_fitness_plan",
      () =>
        supabase.rpc("replace_fitness_plan", {
          p_effective_from: null,
          p_plan: null,
        }),
      ["22023"],
    ),
    rpcProbe(
      "rpc configure_fitness_plan",
      () =>
        supabase.rpc("configure_fitness_plan", {
          p_effective_from: null,
          p_plan: null,
          p_profile: null,
        }),
      ["22023"],
    ),

    // -- crew ---------------------------------------------------------------
    read("orbit_profiles", "user_id"),
    probe("friendships: read", async () =>
      supabase.from("friendships").select("id").limit(1),
    ),
    read("orbit_snapshots", "day"),
    probe("orbit_reactions: read", async () =>
      supabase.from("orbit_reactions").select("day").limit(1),
    ),
    // An empty code cannot match a profile: the function answers 'unknown'
    // without writing anything, which proves it exists and runs.
    probe("rpc request_friendship", async () =>
      supabase.rpc("request_friendship", { p_code: "" }),
    ),
    // A row id that cannot exist: both update zero rows and return cleanly.
    probe("rpc respond_to_friendship", async () =>
      supabase.rpc("respond_to_friendship", { p_accept: false, p_id: noRow }),
    ),
    probe("rpc remove_friendship", async () =>
      supabase.rpc("remove_friendship", { p_id: noRow }),
    ),
    rpcProbe(
      "rpc publish_orbit_snapshot",
      () =>
        supabase.rpc("publish_orbit_snapshot", {
          p_altitude: 0,
          p_day: null,
          p_rings_closed: 0,
          p_rings_total: 0,
          p_score: 0,
          p_streak: 0,
          p_tier_id: "probe",
        }),
      ["P0001"], // "Invalid snapshot day"
    ),
    rpcProbe(
      "rpc react_to_day",
      () =>
        supabase.rpc("react_to_day", {
          p_day: today,
          p_kind: "fire",
          p_to_user: noRow,
        }),
      ["P0001"], // "Not in your crew"
    ),

    // -- push reminders -----------------------------------------------------
    read("push_subscriptions", "endpoint"),
    rpcProbe(
      "rpc save_push_subscription",
      () =>
        supabase.rpc("save_push_subscription", {
          p_auth: "x",
          p_endpoint: "",
          p_p256dh: "x",
        }),
      ["P0001"], // "Invalid subscription endpoint" — verified on a real DB
    ),

    // -- the rest of the day ------------------------------------------------
    read("weekly_reflections", "week_start"),
    read("finance_transactions", "id"),
    read("ingest_tokens", "created_at"),
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

  const failures = probes.filter((item) => !item.ok);

  return NextResponse.json(
    {
      account: {
        pinnedTaskCategory: preferences.pinnedTaskCategory || null,
        timeZone,
        today,
      },
      probes,
      summary: {
        failed: failures.map((item) => item.name),
        ok: probes.length - failures.length,
        total: probes.length,
      },
      tasks,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
