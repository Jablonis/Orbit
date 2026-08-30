"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import { actionResult } from "@/lib/action-state";
import {
  type SportType,
  type TrainingQuality,
  type WeekdayId,
  ensureFitnessPlan,
  getDateForWeekday,
  setSessionCompletion,
  weekdayOrder,
} from "@/lib/fitness";
import {
  buildReviewedFitnessPlan,
  defaultFitnessProfile,
  getFitnessProfile,
  normalizeFitnessProfile,
} from "@/lib/fitness-setup";
import {
  buildBlock,
  buildFitnessPlanPayload,
  meetsFrequencyRule,
} from "@/lib/training-block";
import { getActiveTrainingBlock } from "@/lib/training-block-data";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";

const sportTypes: SportType[] = ["gym", "tennis", "cardio", "mobility", "rest"];
const trainingQualities: TrainingQuality[] = ["low", "medium", "high"];

export type FitnessActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type FitnessSetupActionState = ActionState;

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

  const preferences = await getDashboardPreferences(supabase, user.id);
  const effectiveFrom = getDateInTimeZone(
    new Date(),
    preferences.regional.timeZone,
  );
  const { error } = await supabase.rpc("set_fitness_plan_day", {
    p_effective_from: effectiveFrom,
    p_sport: sport,
    p_weekday: weekday,
  });
  if (error) {
    console.error("fitness: plan day write failed", error.code, error.message);
    return { ok: false, error: error.message };
  }

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

  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const performedOn = getDateForWeekday(
    today,
    weekday,
    preferences.regional.weekStartsOn,
  );
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

  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const performedOn = getDateForWeekday(
    today,
    weekday,
    preferences.regional.weekStartsOn,
  );
  const failure = await setSessionCompletion(
    supabase,
    user.id,
    performedOn,
    completed,
    { durationMinutes: 60, quality: "medium", sport: sport as SportType },
  );
  if (failure) {
    console.error("fitness: toggle failed", failure.code, failure.message);
    return { ok: false, error: failure.message };
  }

  revalidateFitness();
  return { ok: true };
}

export async function completeTodayTrainingAction(): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const weeklyPlan = await ensureFitnessPlan(
    supabase,
    user.id,
    today,
    preferences.regional.weekStartsOn,
  );
  if (!weeklyPlan) {
    return {
      ok: false,
      error: "Set up your Fitness plan before completing a workout.",
    };
  }
  const day = weeklyPlan.find((item) => item.date === today);

  if (!day || day.sport === "rest") {
    return { ok: false, error: "Today is a recovery day in your fitness plan." };
  }
  if (day.log.completed) return { ok: true };

  const failure = await setSessionCompletion(supabase, user.id, today, true, {
    durationMinutes: day.plannedDurationMinutes || 60,
    notes: day.log.notes,
    performedAt: day.plannedTime || null,
    quality: day.log.quality,
    sport: day.sport,
  });
  if (failure) {
    console.error("fitness: complete-today failed", failure.code, failure.message);
    return { ok: false, error: failure.message };
  }

  revalidateFitness();
  return { ok: true };
}

/**
 * Marking today's session done from the dashboard.
 *
 * The dashboard knows the date and nothing else — it draws one day, not a
 * week — so this resolves the sport and the planned duration from the plan
 * itself rather than trusting a form to carry them. It used to post `date` to
 * an action that read `weekday` and `sport`, so every press was rejected as an
 * invalid session, and the result was thrown away without being shown: the
 * button moved, nothing was written, and the app looked like it had no
 * functionality at all. It very nearly did.
 */
export async function setTrainingDoneAction(
  _state: FitnessSetupActionState,
  formData: FormData,
): Promise<FitnessSetupActionState> {
  const { supabase, user } = await getAuthenticatedUser();
  const date = String(formData.get("date") ?? "");
  const completed = String(formData.get("completed") ?? "") === "true";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { message: "That day could not be identified.", ok: false };
  }

  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const plan = await ensureFitnessPlan(
    supabase,
    user.id,
    today,
    preferences.regional.weekStartsOn,
  );
  const day = plan?.find((item) => item.date === date);

  if (!day) {
    return { message: "Set up your training week first.", ok: false };
  }
  if (day.sport === "rest") {
    return { message: "That day is a recovery day.", ok: false };
  }

  const failure = await setSessionCompletion(supabase, user.id, date, completed, {
    durationMinutes: day.plannedDurationMinutes || 60,
    quality: day.log.quality,
    sport: day.sport,
  });
  if (failure) {
    console.error("fitness: session write failed", failure.code, failure.message);
    return actionResult(false, failure.message);
  }

  revalidateFitness();
  return actionResult(
    true,
    completed ? "Training logged." : "Training un-marked.",
  );
}

export async function toggleFitnessDoneFormAction(formData: FormData) {
  await toggleFitnessDoneAction(formData);
}

export async function resetFitnessPlanAction(): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const effectiveFrom = getDateInTimeZone(
    new Date(),
    preferences.regional.timeZone,
  );
  const { error } = await supabase.rpc("configure_fitness_plan", {
    p_effective_from: effectiveFrom,
    p_plan: buildReviewedFitnessPlan(defaultFitnessProfile),
    p_profile: {
      available_days: defaultFitnessProfile.availableDays,
      equipment: defaultFitnessProfile.equipment,
      exercises_to_avoid: defaultFitnessProfile.exercisesToAvoid,
      experience: defaultFitnessProfile.experience,
      goal: defaultFitnessProfile.goal,
      session_length_minutes: defaultFitnessProfile.sessionLengthMinutes,
      template_id: defaultFitnessProfile.templateId,
    },
  });
  if (error) return { ok: false, error: "The training plan could not be reset." };

  revalidateFitness();
  return { ok: true };
}

export async function configureFitnessAction(
  _state: FitnessSetupActionState,
  formData: FormData,
): Promise<FitnessSetupActionState> {
  const profile = normalizeFitnessProfile({
    availableDays: formData.getAll("availableDays").map(String),
    equipment: formData.getAll("equipment").map(String),
    exercisesToAvoid: String(formData.get("exercisesToAvoid") ?? ""),
    experience: String(formData.get("experience") ?? ""),
    goal: String(formData.get("goal") ?? ""),
    sessionLengthMinutes: Number(formData.get("sessionLengthMinutes")),
  });
  if (!profile) {
    return {
      message:
        "Choose a goal, experience level, equipment, at least one day, and a session length.",
      ok: false,
    };
  }

  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const effectiveFrom = getDateInTimeZone(
    new Date(),
    preferences.regional.timeZone,
  );
  const { error } = await supabase.rpc("configure_fitness_plan", {
    p_effective_from: effectiveFrom,
    p_plan: buildReviewedFitnessPlan(profile),
    p_profile: {
      available_days: profile.availableDays,
      equipment: profile.equipment,
      exercises_to_avoid: profile.exercisesToAvoid,
      experience: profile.experience,
      goal: profile.goal,
      session_length_minutes: profile.sessionLengthMinutes,
      template_id: profile.templateId,
    },
  });

  if (error) {
    return {
      message: "The Fitness setup could not be saved. Your choices are still here.",
      ok: false,
    };
  }

  revalidateFitness();
  return {
    message: "Training setup saved and the future plan was rebuilt.",
    ok: true,
  };
}

/**
 * Start the next six weeks.
 *
 * Two calls, deliberately not one: the weekly plan is rewritten first through
 * the function that already owns that job and snapshots every row it touches,
 * and the block is written second. Both are idempotent enough to press again —
 * if the second fails the message says exactly that, rather than leaving a
 * definer function here with a second copy of the plan-writing rules in it.
 */
export async function startTrainingBlockAction(): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const profile = await getFitnessProfile(supabase, user.id);
  if (!profile) {
    return { ok: false, error: "Finish Training setup first." };
  }

  const preferences = await getDashboardPreferences(supabase, user.id);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);

  let blockIndex = 1;
  try {
    const active = await getActiveTrainingBlock(supabase, user.id);
    blockIndex = (active?.blockIndex ?? 0) + 1;
  } catch (error) {
    console.error("fitness: block lookup failed", error);
    return { ok: false, error: "The programme could not be read." };
  }

  const block = buildBlock(profile, blockIndex);
  if (!block) {
    return {
      ok: false,
      error:
        "With one training day a week no programme can train every muscle group twice. Add a second day in Training setup — and if two is all you have, make them at least 60 minutes.",
    };
  }

  // Belt to the library's braces. The tests prove this never fires; the action
  // still refuses rather than shipping a programme that breaks the rule.
  const verdict = meetsFrequencyRule(block.coverage);
  if (!verdict.ok || block.unfilled.length > 0) {
    const thin = [...verdict.missing, ...verdict.under].join(", ");
    return {
      ok: false,
      error: `Your equipment and avoid list leave ${thin || "some muscle groups"} under twice a week. Add equipment in Training setup, or shorten the avoid list.`,
    };
  }

  const planError = await supabase.rpc("replace_fitness_plan", {
    p_effective_from: today,
    p_plan: buildFitnessPlanPayload(profile, block),
  });
  if (planError.error) {
    console.error(
      "fitness: block plan write failed",
      planError.error.code,
      planError.error.message,
    );
    return { ok: false, error: "The training week could not be updated." };
  }

  const { error } = await supabase.rpc("start_training_block", {
    p_sessions: block.sessions.map((session) => ({
      exercises: session.prescriptions.map((prescription) => ({
        exercise_id: prescription.exerciseId,
        position: prescription.position,
        rep_high: prescription.repHigh,
        rep_low: prescription.repLow,
        target_sets: prescription.targetSets,
      })),
      label: session.label,
      slot: session.slot,
      weekday: session.weekday,
    })),
    p_split_id: block.splitId,
    p_started_on: today,
    p_weeks: block.weeks,
  });
  if (error) {
    console.error("fitness: block start failed", error.code, error.message);
    return {
      ok: false,
      error:
        "Your training week was updated, but the programme could not start. Press Start again.",
    };
  }

  revalidateFitness();
  return { ok: true };
}

export async function archiveTrainingBlockAction(): Promise<FitnessActionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  let blockId: string | null = null;
  try {
    blockId = (await getActiveTrainingBlock(supabase, user.id))?.id ?? null;
  } catch (error) {
    console.error("fitness: block lookup failed", error);
  }
  if (!blockId) return { ok: false, error: "No programme is running." };

  const { error } = await supabase.rpc("archive_training_block", {
    p_id: blockId,
  });
  if (error) {
    console.error("fitness: block archive failed", error.code, error.message);
    return { ok: false, error: "The programme could not be ended." };
  }

  revalidateFitness();
  return { ok: true };
}
