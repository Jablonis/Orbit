"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { getWeekDateKeys } from "@/lib/fitness";
import {
  dashboardCardIds,
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
  const preferences = parseDashboardPreferences({
    cardOrder: formData.getAll("cardOrder"),
    density: formData.get("density"),
    hiddenCards: formData.getAll("hiddenCards"),
    pinnedFinanceMetric: formData.get("pinnedFinanceMetric"),
    pinnedTaskCategory: formData.get("pinnedTaskCategory"),
    rangeDays: Number(formData.get("rangeDays")),
  });

  if (preferences.hiddenCards.length === dashboardCardIds.length) {
    return { message: "Keep at least one dashboard card visible.", ok: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_preferences: preferences })
    .eq("id", user.id);

  if (error) {
    return { message: "Overview preferences could not be saved.", ok: false };
  }

  revalidatePath("/");
  return { message: "Overview preferences saved.", ok: true };
}

export async function saveWeeklyReflectionAction(
  _state: WeeklyReflectionActionState,
  formData: FormData,
): Promise<WeeklyReflectionActionState> {
  const { supabase, user } = await getAuthenticatedUser();
  const weekStart = getWeekDateKeys(getDateInTimeZone())[0];
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
