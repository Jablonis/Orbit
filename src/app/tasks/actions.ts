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

export async function saveTaskAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");
  const estimateMode = String(formData.get("estimateMode") ?? "1hr") as TaskEstimateMode;
  const timeFrom = String(formData.get("timeFrom") ?? "");
  const timeTo = String(formData.get("timeTo") ?? "");
  const estimateMinutes =
    estimateMode === "other"
      ? Math.max(getMinutesBetweenTimes(timeFrom, timeTo), 0)
      : presetEstimateMinutes[estimateMode] ?? 60;
  const input = {
    category: String(formData.get("category") ?? "Jadro").trim() || "Jadro",
    completed: String(formData.get("completed") ?? "") === "true",
    complexity: String(formData.get("complexity") ?? "medium") as TaskComplexity,
    dueDate: String(formData.get("dueDate") ?? ""),
    estimateMinutes,
    estimateMode,
    note: String(formData.get("note") ?? "").trim(),
    priority: String(formData.get("priority") ?? "normal") as TaskPriority,
    timeFrom: estimateMode === "other" ? timeFrom : "",
    timeTo: estimateMode === "other" ? timeTo : "",
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "deep-work") as TaskType,
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

export async function deleteTaskAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");

  if (!id) return;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/tasks");
}
