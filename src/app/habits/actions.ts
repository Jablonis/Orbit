"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { describeHabitError } from "@/lib/habits";
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
 * What went wrong, said out loud.
 *
 * "That could not be saved. Try again." is the failure telling you nothing,
 * and trying again does not help when the reason is a table that does not
 * exist. This is a personal planner with one account on it, so the database's
 * own message and code go to the screen as well as the log: they are the
 * difference between a bug report and a round trip.
 */
function failure(where: string, error: { code?: string; message?: string } | null) {
  console.error(`habits: ${where} failed`, error?.code, error?.message);
  return { message: describeHabitError(error), ok: false } satisfies HabitActionState;
}

function readDays(formData: FormData) {
  return normaliseRepeatDays(
    formData.getAll("repeatDays").map((value) => Number(value)),
  );
}

/**
 * A thrown server action gives the browser an opaque reference number and
 * nothing else — the reason is redacted in production. So nothing here is
 * allowed to throw: whatever happens becomes a sentence.
 */
async function guarded(
  where: string,
  run: () => Promise<HabitActionState>,
): Promise<HabitActionState> {
  try {
    return await run();
  } catch (error) {
    // A redirect is not a failure: `getAuthenticatedUser` throws one to send a
    // signed-out visitor to the login form, and swallowing it would strand
    // them here instead.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`habits: ${where} threw`, reason);
    return { message: reason, ok: false };
  }
}

export async function saveHabitAction(
  _state: HabitActionState,
  formData: FormData,
): Promise<HabitActionState> {
  return guarded("save", () => saveHabit(formData));
}

async function saveHabit(formData: FormData): Promise<HabitActionState> {
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
  return guarded("archive", () => archiveHabit(formData));
}

async function archiveHabit(formData: FormData): Promise<HabitActionState> {
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
  await guarded("tick", () => tickHabit(formData));
}

async function tickHabit(formData: FormData): Promise<HabitActionState> {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { message: "", ok: true };
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
    return { message: describeHabitError(error), ok: false };
  }

  revalidateHabits();
  return { message: "", ok: true };
}
