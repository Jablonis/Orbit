"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  SportType,
  TrainingQuality,
  WeekdayId,
  defaultWeeklyPlan,
  weekdayOrder,
} from "@/lib/fitness";

const sportTypes: SportType[] = ["gym", "tennis", "cardio", "mobility", "rest"];
const trainingQualities: TrainingQuality[] = ["low", "medium", "high"];

export type FitnessActionResult =
  | { ok: true }
  | { ok: false; error: string };

function isWeekday(value: string): value is WeekdayId {
  return weekdayOrder.includes(value as WeekdayId);
}

function isSport(value: string): value is SportType {
  return sportTypes.includes(value as SportType);
}

function isQuality(value: string): value is TrainingQuality {
  return trainingQualities.includes(value as TrainingQuality);
}

export async function updateFitnessDayAction(
  formData: FormData,
): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const weekday = String(formData.get("weekday") ?? "");
  const sport = String(formData.get("sport") ?? "");

  if (!isWeekday(weekday) || !isSport(sport)) {
    return { ok: false, error: "Invalid training day." };
  }

  const { error } = await supabase.from("fitness_weekly_plan").upsert(
    {
      ...(sport === "rest" ? { completed: false } : {}),
      sport,
      user_id: user.id,
      weekday,
    },
    { onConflict: "user_id,weekday" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/fitness");
  return { ok: true };
}

export async function saveFitnessLogAction(
  formData: FormData,
): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const weekday = String(formData.get("weekday") ?? "");
  const sport = String(formData.get("sport") ?? "");
  const qualityValue = String(formData.get("quality") ?? "medium");
  const durationValue = Number(formData.get("durationMinutes") ?? 60);

  if (!isWeekday(weekday) || !isSport(sport) || !isQuality(qualityValue)) {
    return { ok: false, error: "Invalid training details." };
  }

  const durationMinutes = Number.isFinite(durationValue)
    ? Math.min(1440, Math.max(0, Math.round(durationValue)))
    : 60;

  const { error } = await supabase.from("fitness_weekly_plan").upsert(
    {
      completed:
        sport !== "rest" && String(formData.get("completed") ?? "") === "on",
      duration_minutes: durationMinutes,
      notes: String(formData.get("notes") ?? "").trim(),
      quality: qualityValue,
      sport,
      time: String(formData.get("time") ?? "").trim(),
      user_id: user.id,
      weekday,
    },
    { onConflict: "user_id,weekday" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/fitness");
  return { ok: true };
}

export async function toggleFitnessDoneAction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();
  const weekday = String(formData.get("weekday") ?? "") as WeekdayId;
  const sport = String(formData.get("sport") ?? "gym") as SportType;
  const completed = String(formData.get("completed") ?? "") === "true";

  if (!weekday) return;

  const { error } = await supabase.from("fitness_weekly_plan").upsert(
    {
      completed,
      sport,
      user_id: user.id,
      weekday,
    },
    { onConflict: "user_id,weekday" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/fitness");
}

export async function resetFitnessPlanAction() {
  const { supabase, user } = await getAuthenticatedUser();
  const rows = defaultWeeklyPlan.map((day) => ({
    completed: false,
    duration_minutes: 60,
    notes: "",
    quality: "medium",
    sport: day.sport,
    time: "",
    user_id: user.id,
    weekday: day.id,
  }));
  const { error } = await supabase
    .from("fitness_weekly_plan")
    .upsert(rows, { onConflict: "user_id,weekday" });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/fitness");
}
