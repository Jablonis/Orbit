"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { isMissingHabitsSchema } from "@/lib/habits";
import { getDashboardPreferences } from "@/lib/preferences";
import { normaliseRepeatDays } from "@/lib/routines";
import { getDateInTimeZone } from "@/lib/tasks";

export type HabitActionState = {
  message: string;
  ok: boolean;
};

export const idleHabitState: HabitActionState = { message: "", ok: true };

function revalidateHabits() {
  revalidatePath("/");
  revalidatePath("/habits");
}

/**
 * The one sentence a failure is allowed to say, plus the reason underneath it
 * in the server log. Routines shipped without the second half, and a whole
 * afternoon went into rediscovering that the database simply had not been
 * migrated yet.
 */
function failure(where: string, error: { code?: string; message?: string } | null) {
  console.error(`habits: ${where} failed`, error?.code, error?.message);
  if (isMissingHabitsSchema(error)) {
    return {
      message: "Habits are not set up on this database yet.",
      ok: false,
    } satisfies HabitActionState;
  }
  return { message: "That could not be saved. Try again.", ok: false };
}

function readDays(formData: FormData) {
  return normaliseRepeatDays(
    formData.getAll("repeatDays").map((value) => Number(value)),
  );
}

export async function saveHabitAction(
  _state: HabitActionState,
  formData: FormData,
): Promise<HabitActionState> {
  const { supabase } = await getAuthenticatedUser();
  const name = String(formData.get("name") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const days = readDays(formData);

  if (!name) return { message: "Give the habit a name.", ok: false };
  if (name.length > 60) {
    return { message: "Keep the name under 60 characters.", ok: false };
  }
  if (days.length === 0) {
    return { message: "Pick at least one day it should come back on.", ok: false };
  }

  const { error } = await supabase.rpc("save_habit", {
    p_id: id || null,
    p_name: name,
    p_repeat_days: days,
  });
  if (error) return failure("save", error);

  revalidateHabits();
  return { message: id ? "Habit updated." : "Habit added.", ok: true };
}

export async function archiveHabitAction(
  _state: HabitActionState,
  formData: FormData,
): Promise<HabitActionState> {
  const { supabase } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { message: "That habit no longer exists.", ok: false };

  const { error } = await supabase.rpc("archive_habit", { p_id: id });
  if (error) return failure("archive", error);

  revalidateHabits();
  return { message: "Habit removed.", ok: true };
}

/**
 * Ticking a habit for a day. The date comes from the account's own time zone
 * rather than the form, so a stale tab cannot tick yesterday by accident.
 */
export async function toggleHabitAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const done = formData.get("done") === "true";

  const { error } = await supabase.rpc("set_habit_check", {
    p_date: today,
    p_done: done,
    p_habit_id: id,
  });
  if (error) {
    console.error("habits: tick failed", error.code, error.message);
    return;
  }

  revalidateHabits();
}
