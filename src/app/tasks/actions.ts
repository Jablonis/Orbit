"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { startOperation } from "@/lib/operation-log.server";
import {
  TaskComplexity,
  TaskEstimateMode,
  TaskPriority,
  TaskType,
  getDateInTimeZone,
  getMinutesBetweenTimes,
  isMissingRoutineColumn,
  toTaskInsert,
  withoutRoutineColumn,
} from "@/lib/tasks";
import { normaliseRepeatDays } from "@/lib/routines";

const presetEstimateMinutes: Record<Exclude<TaskEstimateMode, "other">, number> = {
  "1hr": 60,
  "2hr": 120,
  "3hr": 180,
};

const taskTypes: TaskType[] = ["deep-work", "admin", "learning", "personal"];
const complexities: TaskComplexity[] = ["easy", "medium", "hard"];
const priorities: TaskPriority[] = ["low", "normal", "high"];
const estimateModes: TaskEstimateMode[] = ["1hr", "2hr", "3hr", "other"];

export type TaskArchiveResult =
  | { ok: true; taskId: string }
  | { ok: false; error: string };

export type TaskSaveResult =
  | { ok: true }
  | { ok: false; error: string };

export type BulkTaskIntent = "archive" | "complete" | "reopen" | "reschedule";
export type BulkTaskResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

function valueIn<T extends string>(value: string, values: T[], fallback: T) {
  return values.includes(value as T) ? (value as T) : fallback;
}

export async function saveTaskAction(formData: FormData): Promise<TaskSaveResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");
  const estimateMode = valueIn(
    String(formData.get("estimateMode") ?? "1hr"),
    estimateModes,
    "1hr",
  );
  const timeFrom = String(formData.get("timeFrom") ?? "");
  const timeTo = String(formData.get("timeTo") ?? "");
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    estimateMode === "other" &&
    (!validTime.test(timeFrom) ||
      !validTime.test(timeTo) ||
      getMinutesBetweenTimes(timeFrom, timeTo) <= 0)
  ) {
    return {
      ok: false,
      error: "Choose different From and To times for the custom estimate.",
    };
  }
  const estimateMinutes =
    estimateMode === "other"
      ? Math.max(getMinutesBetweenTimes(timeFrom, timeTo), 0)
      : presetEstimateMinutes[estimateMode] ?? 60;
  const input = {
    category: (String(formData.get("category") ?? "General").trim() || "General").slice(0, 80),
    completed: String(formData.get("completed") ?? "") === "true",
    complexity: valueIn(
      String(formData.get("complexity") ?? "medium"),
      complexities,
      "medium",
    ),
    dueDate: String(formData.get("dueDate") ?? ""),
    estimateMinutes,
    estimateMode,
    note: String(formData.get("note") ?? "").trim().slice(0, 2000),
    priority: valueIn(
      String(formData.get("priority") ?? "normal"),
      priorities,
      "normal",
    ),
    repeatDays: normaliseRepeatDays(
      formData.getAll("repeatDays").map((day) => Number(day)),
    ),
    timeFrom: estimateMode === "other" ? timeFrom : "",
    timeTo: estimateMode === "other" ? timeTo : "",
    title: String(formData.get("title") ?? "").trim().slice(0, 200),
    type: valueIn(
      String(formData.get("type") ?? "deep-work"),
      taskTypes,
      "deep-work",
    ),
  };

  if (!input.title) {
    return { ok: false, error: "Add a task title." };
  }

  const row = toTaskInsert(input, user.id);
  // A database without the routines migration still saves ordinary tasks.
  const write = (values: Record<string, unknown>) =>
    id
      ? supabase.from("tasks").update(values).eq("id", id).eq("user_id", user.id)
      : supabase.from("tasks").insert(values);
  const failure = id
    ? "The task could not be updated."
    : "The task could not be created.";

  const { error } = await write(row);
  if (error) {
    if (!isMissingRoutineColumn(error)) return { ok: false, error: failure };
    const retry = await write(withoutRoutineColumn(row));
    if (retry.error) return { ok: false, error: failure };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true };
}

export async function toggleTaskAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");
  const completed = String(formData.get("completed") ?? "") === "true";
  const date = String(formData.get("date") ?? "");

  if (!id) return;

  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("repeat_days")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  // No routines column means no routines: everything is a plain task.
  if (readError && !isMissingRoutineColumn(readError)) {
    throw new Error(readError.message);
  }
  if (!readError && !task) return;

  // A routine is done for a day, not for good: ticking it writes that one day's
  // completion and leaves the task itself open for tomorrow. Anything else and
  // a daily habit would need reopening every morning.
  if ((task?.repeat_days as number[] | null)?.length) {
    const { error } = await supabase.rpc("set_routine_completion", {
      p_date: /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : getDateInTimeZone(new Date()),
      p_done: completed,
      p_task_id: id,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function archiveTaskAction(
  formData: FormData,
): Promise<TaskArchiveResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const operation = startOperation("tasks.archive");
  const id = String(formData.get("id") ?? "");

  if (!id) {
    operation.finish("invalid_task", { status: 400 });
    return { ok: false, error: "Choose a task to archive." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    operation.finish("database_error", { status: 500 });
    return { ok: false, error: "The task could not be archived." };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  operation.finish("success", { status: 200 });
  return { ok: true, taskId: id };
}

export async function restoreTaskAction(taskId: string): Promise<TaskArchiveResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const operation = startOperation("tasks.restore");

  if (!taskId) {
    operation.finish("invalid_task", { status: 400 });
    return { ok: false, error: "Choose a task to restore." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ archived_at: null })
    .eq("id", taskId)
    .eq("user_id", user.id);
  if (error) {
    operation.finish("database_error", { status: 500 });
    return { ok: false, error: "The task could not be restored." };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  operation.finish("success", { status: 200 });
  return { ok: true, taskId };
}

export async function bulkUpdateTasksAction(
  taskIds: string[],
  intent: BulkTaskIntent,
  dueDate = "",
): Promise<BulkTaskResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const ids = [...new Set(taskIds)].filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id),
  ).slice(0, 100);

  if (ids.length === 0) {
    return { ok: false, error: "Select at least one task." };
  }
  if (intent === "reschedule" && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false, error: "Choose a valid reschedule date." };
  }

  // A routine has no single completed state to set, so bulk complete and
  // reopen simply leave routines alone rather than half-applying to them.
  let targets = ids;
  if (intent === "complete" || intent === "reopen") {
    const { data: rows, error: readError } = await supabase
      .from("tasks")
      .select("id,repeat_days")
      .eq("user_id", user.id)
      .in("id", ids);
    if (readError && !isMissingRoutineColumn(readError)) {
      return { ok: false, error: "The selected tasks could not be updated." };
    }
    targets = readError
      ? ids
      : (rows ?? [])
          .filter((row) => !(row.repeat_days as number[] | null)?.length)
          .map((row) => row.id as string);
    if (targets.length === 0) {
      return { ok: true, updated: 0 };
    }
  }

  const update =
    intent === "archive"
      ? { archived_at: new Date().toISOString() }
      : intent === "complete"
        ? { completed: true }
        : intent === "reopen"
          ? { completed: false }
          : { due_date: dueDate };
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("user_id", user.id)
    .in("id", targets)
    .select("id");

  if (error) {
    return { ok: false, error: "The selected tasks could not be updated." };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true, updated: data?.length ?? 0 };
}

export type RoutineSetupResult =
  | { ok: true; added: number }
  | { ok: false; error: string };

export type RoutineDraft = {
  category?: string;
  days: number[];
  from: string;
  note?: string;
  title: string;
  to: string;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Enough for a week of routines twice over, few enough to be one insert. */
const ROUTINE_LIMIT = 20;

/**
 * Set up a week's worth of routines in one go.
 *
 * The catalogue is a starting point rather than a menu: every row can have its
 * days and its times changed, and rows that were never in the catalogue can be
 * added — most people have one thing nobody else has. So this takes the edited
 * rows and validates them the way the ordinary task form is validated, rather
 * than trusting a list of catalogue ids.
 */
export async function addRoutineKitAction(
  drafts: RoutineDraft[],
): Promise<RoutineSetupResult> {
  const { supabase, user } = await getAuthenticatedUser();

  const items = (Array.isArray(drafts) ? drafts : [])
    .slice(0, ROUTINE_LIMIT)
    .map((draft) => ({
      category: String(draft.category ?? "Routine").trim().slice(0, 80) || "Routine",
      days: normaliseRepeatDays(
        (Array.isArray(draft.days) ? draft.days : []).map(Number),
      ),
      from: String(draft.from ?? ""),
      note: String(draft.note ?? "").trim().slice(0, 2000),
      title: String(draft.title ?? "").trim().slice(0, 200),
      to: String(draft.to ?? ""),
    }))
    .filter((item) => item.title && item.days.length > 0);

  if (items.length === 0) {
    return { ok: false, error: "Give every routine a name and at least one day." };
  }

  const badTime = items.find(
    (item) =>
      !TIME.test(item.from) ||
      !TIME.test(item.to) ||
      getMinutesBetweenTimes(item.from, item.to) <= 0,
  );
  if (badTime) {
    return {
      ok: false,
      error: `Check the times on “${badTime.title}” — it has to end after it starts.`,
    };
  }

  const { data: existing, error: readError } = await supabase
    .from("tasks")
    .select("title")
    .eq("user_id", user.id)
    .is("archived_at", null);
  if (readError) {
    return { ok: false, error: "The routines could not be added." };
  }

  // Running the setup twice should not leave two morning routines behind.
  const taken = new Set(
    (existing ?? []).map((task) => String(task.title).trim().toLocaleLowerCase()),
  );
  const fresh = items.filter((item) => {
    const key = item.title.toLocaleLowerCase();
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });

  if (fresh.length === 0) {
    return { ok: true, added: 0 };
  }

  const { error } = await supabase.from("tasks").insert(
    fresh.map((item) =>
      toTaskInsert(
        {
          category: item.category,
          complexity: "medium",
          dueDate: "",
          estimateMinutes: getMinutesBetweenTimes(item.from, item.to),
          estimateMode: "other",
          note: item.note,
          priority: "normal",
          repeatDays: item.days,
          timeFrom: item.from,
          timeTo: item.to,
          title: item.title,
          type: "personal",
        },
        user.id,
      ),
    ),
  );
  if (error) {
    if (isMissingRoutineColumn(error)) {
      return {
        ok: false,
        error: "Routines need the latest database migration. Run supabase db push.",
      };
    }
    // A generic message with nothing behind it is how the last one of these
    // cost an afternoon of guessing: the reason goes to the server log.
    console.error("routines.insert failed", {
      code: error.code,
      details: error.details,
      message: error.message,
    });
    return { ok: false, error: "The routines could not be added." };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true, added: fresh.length };
}
