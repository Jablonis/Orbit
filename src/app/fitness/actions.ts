"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type SportType,
  type TrainingQuality,
  type WeekdayId,
  defaultWeeklyPlan,
  getDateForWeekday,
  weekdayOrder,
} from "@/lib/fitness";
import { getDateInTimeZone } from "@/lib/tasks";

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

function revalidateFitness() {
  revalidatePath("/");
  revalidatePath("/fitness");
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

  const { error } = await supabase.from("fitness_plan_days").upsert(
    { sport, user_id: user.id, weekday },
    { onConflict: "user_id,weekday" },
  );
  if (error) return { ok: false, error: "The training plan could not be saved." };

  revalidateFitness();
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

  if (
    !isWeekday(weekday) ||
    !isSport(sport) ||
    sport === "rest" ||
    !isQuality(qualityValue)
  ) {
    return { ok: false, error: "Invalid training details." };
  }

  const durationMinutes = Number.isFinite(durationValue)
    ? Math.min(1440, Math.max(0, Math.round(durationValue)))
    : 60;
  const performedOn = getDateForWeekday(getDateInTimeZone(), weekday);
  const { error } = await supabase.from("fitness_sessions").upsert(
    {
      completed: String(formData.get("completed") ?? "") === "on",
      duration_minutes: durationMinutes,
      notes: String(formData.get("notes") ?? "").trim().slice(0, 2000),
      performed_at: String(formData.get("time") ?? "").trim() || null,
      performed_on: performedOn,
      quality: qualityValue,
      sport,
      user_id: user.id,
    },
    { onConflict: "user_id,performed_on" },
  );
  if (error) return { ok: false, error: "The training session could not be saved." };

  revalidateFitness();
  return { ok: true };
}

export async function toggleFitnessDoneAction(
  formData: FormData,
): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const weekday = String(formData.get("weekday") ?? "");
  const sport = String(formData.get("sport") ?? "");
  const completed = String(formData.get("completed") ?? "") === "true";

  if (!isWeekday(weekday) || !isSport(sport) || sport === "rest") {
    return { ok: false, error: "Invalid training session." };
  }

  const { error } = await supabase.from("fitness_sessions").upsert(
    {
      completed,
      duration_minutes: 60,
      performed_on: getDateForWeekday(getDateInTimeZone(), weekday),
      quality: "medium",
      sport,
      user_id: user.id,
    },
    { onConflict: "user_id,performed_on" },
  );
  if (error) return { ok: false, error: "The training status could not be updated." };

  revalidateFitness();
  return { ok: true };
}

export async function toggleFitnessDoneFormAction(formData: FormData) {
  await toggleFitnessDoneAction(formData);
}

export async function resetFitnessPlanAction(): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const rows = defaultWeeklyPlan.map((day) => ({
    notes: "",
    planned_duration_minutes: 60,
    planned_time: null,
    sport: day.sport,
    user_id: user.id,
    weekday: day.id,
  }));
  const { error } = await supabase
    .from("fitness_plan_days")
    .upsert(rows, { onConflict: "user_id,weekday" });
  if (error) return { ok: false, error: "The training plan could not be reset." };

  revalidateFitness();
  return { ok: true };
}
