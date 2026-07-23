"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type SportType,
  type TrainingQuality,
  type WeekdayId,
  defaultWeeklyPlan,
  ensureFitnessPlan,
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
  const durationInput = String(formData.get("durationMinutes") ?? "");
  const durationValue = Number(durationInput);
  const timeValue = String(formData.get("time") ?? "").trim();

  if (
    !isWeekday(weekday) ||
    !isSport(sport) ||
    sport === "rest" ||
    !isQuality(qualityValue)
  ) {
    return { ok: false, error: "Invalid training details." };
  }

  if (
    !durationInput ||
    !Number.isInteger(durationValue) ||
    durationValue < 1 ||
    durationValue > 1440
  ) {
    return { ok: false, error: "Duration must be between 1 and 1,440 minutes." };
  }
  if (timeValue && !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) {
    return { ok: false, error: "Choose a valid training time." };
  }

  const performedOn = getDateForWeekday(getDateInTimeZone(), weekday);
  const { error } = await supabase.from("fitness_sessions").upsert(
    {
      completed: String(formData.get("completed") ?? "") === "on",
      duration_minutes: durationValue,
      notes: String(formData.get("notes") ?? "").trim().slice(0, 2000),
      performed_at: timeValue || null,
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

  const performedOn = getDateForWeekday(getDateInTimeZone(), weekday);
  const { data: existingSession, error: readError } = await supabase
    .from("fitness_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("performed_on", performedOn)
    .maybeSingle();
  if (readError) {
    return { ok: false, error: "The training status could not be updated." };
  }

  const { error } = existingSession
    ? await supabase
        .from("fitness_sessions")
        .update({ completed })
        .eq("id", existingSession.id)
        .eq("user_id", user.id)
    : await supabase.from("fitness_sessions").insert({
        completed,
        duration_minutes: 60,
        performed_on: performedOn,
        quality: "medium",
        sport,
        user_id: user.id,
      });
  if (error) return { ok: false, error: "The training status could not be updated." };

  revalidateFitness();
  return { ok: true };
}

export async function completeTodayTrainingAction(): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const today = getDateInTimeZone();
  const weeklyPlan = await ensureFitnessPlan(supabase, user.id, today);
  const day = weeklyPlan.find((item) => item.date === today);

  if (!day || day.sport === "rest") {
    return { ok: false, error: "Today is a recovery day in your fitness plan." };
  }
  if (day.log.completed) return { ok: true };

  const { data: existingSession, error: readError } = await supabase
    .from("fitness_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("performed_on", today)
    .maybeSingle();
  if (readError) {
    return { ok: false, error: "Today’s training could not be updated." };
  }

  const { error } = existingSession
    ? await supabase
        .from("fitness_sessions")
        .update({ completed: true })
        .eq("id", existingSession.id)
        .eq("user_id", user.id)
    : await supabase.from("fitness_sessions").insert({
        completed: true,
        duration_minutes: day.plannedDurationMinutes || 60,
        notes: day.log.notes,
        performed_at: day.plannedTime || null,
        performed_on: today,
        quality: day.log.quality,
        sport: day.sport,
        user_id: user.id,
      });
  if (error) {
    return { ok: false, error: "Today’s training could not be updated." };
  }

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
