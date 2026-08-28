"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { getWeekDateKeys } from "@/lib/fitness";
import {
  dashboardCardIds,
  defaultDashboardPreferences,
  getDashboardPreferences,
  parseDashboardPreferences,
} from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";

export type DashboardPreferencesActionState = {
  message: string;
  ok: boolean;
};

export type WeeklyReflectionActionState = {
  message: string;
  ok: boolean;
};

export async function saveDashboardPreferencesAction(
  _state: DashboardPreferencesActionState,
  formData: FormData,
): Promise<DashboardPreferencesActionState> {
  const { supabase, user } = await getAuthenticatedUser();
  const reset = formData.get("intent") === "reset";
  const preferences = reset
    ? defaultDashboardPreferences
    : parseDashboardPreferences({
        cardOrder: formData.getAll("cardOrder"),
        density: formData.get("density"),
        hiddenCards: formData.getAll("hiddenCards"),
        pinnedFinanceMetric: formData.get("pinnedFinanceMetric"),
        pinnedTaskCategory: formData.get("pinnedTaskCategory"),
        rangeDays: Number(formData.get("rangeDays")),
        regional: {
          currency: formData.get("currency"),
          displayName: formData.get("displayName"),
          initials: formData.get("initials"),
          locale: formData.get("locale"),
          timeZone: formData.get("timeZone"),
          weekStartsOn: formData.get("weekStartsOn"),
        },
        scoring: {
          focusTargetMinutes: Number(formData.get("focusTargetMinutes")),
          weights: {
            fitness: Number(formData.get("fitnessWeight")),
            focus: Number(formData.get("focusWeight")),
            habits: Number(formData.get("habitsWeight")),
            tasks: Number(formData.get("tasksWeight")),
          },
        },
      });

  if (preferences.hiddenCards.length === dashboardCardIds.length) {
    return { message: "Keep at least one dashboard card visible.", ok: false };
  }
  if (
    Object.values(preferences.scoring.weights).every((weight) => weight === 0)
  ) {
    return { message: "Give at least one score domain a weight.", ok: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_preferences: preferences })
    .eq("id", user.id);

  if (error) {
    return { message: "Overview preferences could not be saved.", ok: false };
  }

  revalidatePath("/", "layout");
  return {
    message: reset
      ? "Overview preferences reset to defaults."
      : "Overview preferences saved.",
    ok: true,
  };
}

export async function saveWeeklyReflectionAction(
  _state: WeeklyReflectionActionState,
  formData: FormData,
): Promise<WeeklyReflectionActionState> {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(
    new Date(),
    preferences.regional.timeZone,
  );
  const weekStart = getWeekDateKeys(
    today,
    preferences.regional.weekStartsOn,
  )[0];
  const { error } = await supabase.from("weekly_reflections").upsert(
    {
      change_next_week: String(formData.get("changeNextWeek") ?? "")
        .trim()
        .slice(0, 2000),
      user_id: user.id,
      week_start: weekStart,
      what_worked: String(formData.get("whatWorked") ?? "").trim().slice(0, 2000),
    },
    { onConflict: "user_id,week_start" },
  );

  if (error) {
    return { message: "The weekly reflection could not be saved.", ok: false };
  }
  revalidatePath("/");
  return { message: "Weekly reflection saved.", ok: true };
}

export type ReminderActionState = { message: string; ok: boolean };

/**
 * The reminder switch saves on its own rather than through the settings form:
 * turning it on also has to ask the browser for permission, which only a
 * client can do.
 */
export async function saveReminderPreferencesAction(
  _state: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  const { supabase, user } = await getAuthenticatedUser();
  const current = await getDashboardPreferences(supabase, user.id);
  const preferences = parseDashboardPreferences({
    ...current,
    reminders: {
      enabled: formData.get("enabled") === "true",
      hour: Number(formData.get("hour")),
    },
  });

  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_preferences: preferences })
    .eq("id", user.id);

  if (error) {
    return { message: "The reminder setting could not be saved.", ok: false };
  }

  revalidatePath("/", "layout");
  return {
    message: preferences.reminders.enabled
      ? `Reminder set for ${preferences.reminders.hour}:00.`
      : "Evening reminder turned off.",
    ok: true,
  };
}
