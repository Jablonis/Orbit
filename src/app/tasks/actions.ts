"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  TaskComplexity,
  TaskEstimateMode,
  TaskPriority,
  TaskType,
  getMinutesBetweenTimes,
  toTaskInsert,
} from "@/lib/tasks";

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

function valueIn<T extends string>(value: string, values: T[], fallback: T) {
  return values.includes(value as T) ? (value as T) : fallback;
}

export async function saveTaskAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");
  const estimateMode = valueIn(
    String(formData.get("estimateMode") ?? "1hr"),
    estimateModes,
    "1hr",
  );
  const timeFrom = String(formData.get("timeFrom") ?? "");
  const timeTo = String(formData.get("timeTo") ?? "");
  const estimateMinutes =
    estimateMode === "other"
      ? Math.max(getMinutesBetweenTimes(timeFrom, timeTo), 0)
      : presetEstimateMinutes[estimateMode] ?? 60;
  const input = {
    category: (String(formData.get("category") ?? "Jadro").trim() || "Jadro").slice(0, 80),
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
    return;
  }

  if (id) {
    const { error } = await supabase
      .from("tasks")
      .update(toTaskInsert(input, user.id))
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tasks").insert(toTaskInsert(input, user.id));
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function toggleTaskAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");
  const completed = String(formData.get("completed") ?? "") === "true";

  if (!id) return;

  const { error } = await supabase
    .from("tasks")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function archiveTaskAction(
  formData: FormData,
): Promise<TaskArchiveResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");

  if (!id) return { ok: false, error: "Choose a task to archive." };

  const { error } = await supabase
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "The task could not be archived." };

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true, taskId: id };
}

export async function restoreTaskAction(taskId: string): Promise<TaskArchiveResult> {
  const { supabase, user } = await getAuthenticatedUser();

  if (!taskId) return { ok: false, error: "Choose a task to restore." };

  const { error } = await supabase
    .from("tasks")
    .update({ archived_at: null })
    .eq("id", taskId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "The task could not be restored." };

  revalidatePath("/");
  revalidatePath("/tasks");
  return { ok: true, taskId };
}
