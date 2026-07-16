"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { getWeekDateKeys } from "@/lib/fitness";
import { getDateInTimeZone } from "@/lib/tasks";

export async function saveWeeklyReflectionAction(formData: FormData) {
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

  if (error) return;
  revalidatePath("/");
}
