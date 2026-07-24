import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type SportType,
  type WeekdayId,
  weekdayOrder,
} from "@/lib/fitness";

export const fitnessGoals = [
  "general_fitness",
  "strength",
  "muscle_gain",
  "conditioning",
  "mobility",
  "sport_support",
] as const;
export type FitnessGoal = (typeof fitnessGoals)[number];

export const fitnessExperiences = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export type FitnessExperience = (typeof fitnessExperiences)[number];

export const fitnessEquipment = [
  "bodyweight",
  "dumbbells",
  "bands",
  "full_gym",
  "cardio",
] as const;
export type FitnessEquipment = (typeof fitnessEquipment)[number];

export const fitnessSessionLengths = [20, 30, 45, 60, 75, 90] as const;
export type FitnessSessionLength = (typeof fitnessSessionLengths)[number];

export type FitnessProfile = {
  availableDays: WeekdayId[];
  equipment: FitnessEquipment[];
  exercisesToAvoid: string;
  experience: FitnessExperience;
  goal: FitnessGoal;
  sessionLengthMinutes: FitnessSessionLength;
  templateId: string;
};

export const defaultFitnessProfile: FitnessProfile = {
  availableDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight"],
  exercisesToAvoid: "",
  experience: "beginner",
  goal: "general_fitness",
  sessionLengthMinutes: 45,
  templateId: "general_starter",
};

export const fitnessGoalLabels: Record<FitnessGoal, string> = {
  conditioning: "Conditioning",
  general_fitness: "General fitness",
  mobility: "Mobility",
  muscle_gain: "Build muscle",
  sport_support: "Support another sport",
  strength: "Build strength",
};

export const fitnessExperienceLabels: Record<FitnessExperience, string> = {
  advanced: "Advanced",
  beginner: "Beginner",
  intermediate: "Intermediate",
};

export const fitnessEquipmentLabels: Record<FitnessEquipment, string> = {
  bands: "Resistance bands",
  bodyweight: "Bodyweight",
  cardio: "Cardio equipment",
  dumbbells: "Dumbbells",
  full_gym: "Full gym",
};

const templateByGoal: Record<
  FitnessGoal,
  { id: string; sports: SportType[] }
> = {
  conditioning: {
    id: "conditioning_starter",
    sports: ["cardio", "cardio", "mobility"],
  },
  general_fitness: {
    id: "general_starter",
    sports: ["gym", "cardio", "mobility"],
  },
  mobility: {
    id: "mobility_starter",
    sports: ["mobility", "mobility", "gym"],
  },
  muscle_gain: {
    id: "muscle_starter",
    sports: ["gym", "gym", "gym", "mobility"],
  },
  sport_support: {
    id: "sport_starter",
    sports: ["gym", "cardio", "mobility"],
  },
  strength: {
    id: "strength_starter",
    sports: ["gym", "gym", "mobility"],
  },
};

export function buildReviewedFitnessPlan(profile: FitnessProfile) {
  const template = templateByGoal[profile.goal];
  const selectedDays = new Set(profile.availableDays);
  let trainingIndex = 0;

  return weekdayOrder.map((weekday) => {
    const isTrainingDay = selectedDays.has(weekday);
    const sport = isTrainingDay
      ? template.sports[trainingIndex++ % template.sports.length]
      : "rest";
    const setupNote = isTrainingDay
      ? `Reviewed ${fitnessGoalLabels[profile.goal].toLowerCase()} starter · ${fitnessExperienceLabels[profile.experience].toLowerCase()} level.`
      : "";

    return {
      notes: setupNote,
      planned_duration_minutes: isTrainingDay
        ? profile.sessionLengthMinutes
        : 0,
      planned_time: null,
      sport,
      weekday,
    };
  });
}

export function normalizeFitnessProfile(input: {
  availableDays: string[];
  equipment: string[];
  exercisesToAvoid: string;
  experience: string;
  goal: string;
  sessionLengthMinutes: number;
}): FitnessProfile | null {
  const availableDays = [...new Set(input.availableDays)].filter((day) =>
    weekdayOrder.includes(day as WeekdayId),
  ) as WeekdayId[];
  const equipment = [...new Set(input.equipment)].filter((item) =>
    fitnessEquipment.includes(item as FitnessEquipment),
  ) as FitnessEquipment[];
  const goal = fitnessGoals.includes(input.goal as FitnessGoal)
    ? (input.goal as FitnessGoal)
    : null;
  const experience = fitnessExperiences.includes(
    input.experience as FitnessExperience,
  )
    ? (input.experience as FitnessExperience)
    : null;
  const sessionLengthMinutes = fitnessSessionLengths.includes(
    input.sessionLengthMinutes as FitnessSessionLength,
  )
    ? (input.sessionLengthMinutes as FitnessSessionLength)
    : null;

  if (
    !goal ||
    !experience ||
    !sessionLengthMinutes ||
    availableDays.length === 0 ||
    equipment.length === 0
  ) {
    return null;
  }

  return {
    availableDays,
    equipment,
    exercisesToAvoid: input.exercisesToAvoid.trim().slice(0, 1000),
    experience,
    goal,
    sessionLengthMinutes,
    templateId: templateByGoal[goal].id,
  };
}

export async function getFitnessProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("fitness_profiles")
    .select(
      "goal,experience,equipment,available_days,session_length_minutes,exercises_to_avoid,template_id",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    availableDays: data.available_days as WeekdayId[],
    equipment: data.equipment as FitnessEquipment[],
    exercisesToAvoid: data.exercises_to_avoid,
    experience: data.experience as FitnessExperience,
    goal: data.goal as FitnessGoal,
    sessionLengthMinutes: data.session_length_minutes as FitnessSessionLength,
    templateId: data.template_id,
  } satisfies FitnessProfile;
}
