import type { SupabaseClient } from "@supabase/supabase-js";

export type SportType = "gym" | "tennis" | "cardio" | "mobility" | "rest";
export type WeekdayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type TrainingQuality = "low" | "medium" | "high";

export type TrainingLog = {
  completed: boolean;
  time: string;
  durationMinutes: number;
  quality: TrainingQuality;
  notes: string;
};

export type WeeklyPlanDay = {
  id: WeekdayId;
  label: string;
  shortLabel: string;
  sport: SportType;
  log: TrainingLog;
};

export type TodayTraining = {
  day: WeeklyPlanDay;
  gymDaysCount: number;
  title: string;
  detail: string;
  focus: string;
};

type DbFitnessDay = {
  weekday: string;
  sport: string;
  completed: boolean;
  time: string | null;
  duration_minutes: number;
  quality: string | null;
  notes: string | null;
};

export const sportLabels: Record<SportType, string> = {
  gym: "Gym",
  tennis: "Tennis",
  cardio: "Cardio",
  mobility: "Mobilita",
  rest: "Rest",
};

export const sportDescriptions: Record<SportType, string> = {
  gym: "Silovy trening podla vypocitaneho splitu.",
  tennis: "Technika, pohyb a koordinacia.",
  cardio: "Kondicia, tepova zona a vytrvalost.",
  mobility: "Mobilita, strecing a kontrola pohybu.",
  rest: "Regeneracia, spanok a priprava na dalsi trening.",
};

export const qualityLabels: Record<TrainingQuality, string> = {
  low: "Tazke",
  medium: "OK",
  high: "Vyborne",
};

export const weekdayOrder: WeekdayId[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const weekdayMeta: Record<WeekdayId, { label: string; shortLabel: string }> = {
  monday: { label: "Pondelok", shortLabel: "Po" },
  tuesday: { label: "Utorok", shortLabel: "Ut" },
  wednesday: { label: "Streda", shortLabel: "St" },
  thursday: { label: "Stvrtok", shortLabel: "Stv" },
  friday: { label: "Piatok", shortLabel: "Pi" },
  saturday: { label: "Sobota", shortLabel: "So" },
  sunday: { label: "Nedela", shortLabel: "Ne" },
};

export const defaultWeeklyPlan: WeeklyPlanDay[] = [
  createDefaultDay("monday", "gym"),
  createDefaultDay("tuesday", "tennis"),
  createDefaultDay("wednesday", "rest"),
  createDefaultDay("thursday", "gym"),
  createDefaultDay("friday", "mobility"),
  createDefaultDay("saturday", "cardio"),
  createDefaultDay("sunday", "rest"),
];

export function createEmptyTrainingLog(): TrainingLog {
  return {
    completed: false,
    time: "",
    durationMinutes: 60,
    quality: "medium",
    notes: "",
  };
}

function createDefaultDay(id: WeekdayId, sport: SportType): WeeklyPlanDay {
  return {
    id,
    ...weekdayMeta[id],
    sport,
    log: createEmptyTrainingLog(),
  };
}

function toSport(value: string): SportType {
  return value === "tennis" ||
    value === "cardio" ||
    value === "mobility" ||
    value === "rest"
    ? value
    : "gym";
}

function toQuality(value: string | null): TrainingQuality {
  return value === "low" || value === "high" ? value : "medium";
}

function toWeekday(value: string): WeekdayId {
  return weekdayOrder.includes(value as WeekdayId) ? (value as WeekdayId) : "monday";
}

export function mapDbFitnessDay(day: DbFitnessDay): WeeklyPlanDay {
  const id = toWeekday(day.weekday);

  return {
    id,
    ...weekdayMeta[id],
    sport: toSport(day.sport),
    log: {
      completed: day.completed,
      time: day.time ?? "",
      durationMinutes: day.duration_minutes,
      quality: toQuality(day.quality),
      notes: day.notes ?? "",
    },
  };
}

export async function ensureFitnessPlan(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("fitness_weekly_plan")
    .select("weekday,sport,completed,time,duration_minutes,quality,notes")
    .order("weekday");

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    const mapped = data.map((day) => mapDbFitnessDay(day as DbFitnessDay));
    return weekdayOrder.map(
      (weekday) =>
        mapped.find((day) => day.id === weekday) ??
        defaultWeeklyPlan.find((day) => day.id === weekday)!,
    );
  }

  const rows = defaultWeeklyPlan.map((day) => ({
    user_id: userId,
    weekday: day.id,
    sport: day.sport,
    completed: day.log.completed,
    time: day.log.time,
    duration_minutes: day.log.durationMinutes,
    quality: day.log.quality,
    notes: day.log.notes,
  }));

  const { error: insertError } = await supabase.from("fitness_weekly_plan").insert(rows);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return defaultWeeklyPlan;
}

function getTodayId(date = new Date()): WeekdayId {
  const weekdays: WeekdayId[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return weekdays[date.getDay()];
}

function getGymSplitLabel(gymDaysCount: number, gymDayIndex: number) {
  if (gymDaysCount <= 1) return "Full Body";
  if (gymDaysCount === 2) return gymDayIndex === 0 ? "Upper / Strength" : "Lower / Hypertrophy";
  if (gymDaysCount === 3) return ["Push", "Pull", "Legs"][gymDayIndex] ?? "Gym";
  if (gymDaysCount === 4) return ["Upper", "Lower", "Push", "Pull"][gymDayIndex] ?? "Gym";
  return ["Push", "Pull", "Legs", "Upper", "Lower"][gymDayIndex % 5];
}

function getTrainingFocus(sport: SportType, gymDaysCount: number, gymDayIndex: number) {
  if (sport !== "gym") {
    return sportDescriptions[sport];
  }

  const split = getGymSplitLabel(gymDaysCount, gymDayIndex);
  const focusBySplit: Record<string, string> = {
    "Full Body": "Squat pattern, press, row, hinge, core.",
    "Upper / Strength": "Bench, row, overhead press, pull work.",
    "Lower / Hypertrophy": "Squat, hinge, unilateral legs, calves.",
    Push: "Chest, shoulders, triceps and pressing volume.",
    Pull: "Back, rear delts, biceps and pulling volume.",
    Legs: "Quads, hamstrings, glutes and trunk stability.",
    Upper: "Balanced upper-body volume with heavy compounds.",
    Lower: "Lower-body strength, posterior chain and carries.",
  };

  return focusBySplit[split] ?? "Silovy trening podla aktualneho splitu.";
}

export function getTrainingForDay(
  weeklyPlan: WeeklyPlanDay[],
  dayId: WeekdayId,
): TodayTraining {
  const day = weeklyPlan.find((item) => item.id === dayId) ?? weeklyPlan[0];
  const gymDays = weeklyPlan.filter((item) => item.sport === "gym");
  const gymDayIndex = gymDays.findIndex((item) => item.id === day.id);

  if (day.sport === "gym") {
    const splitLabel = getGymSplitLabel(gymDays.length, gymDayIndex);

    return {
      day,
      gymDaysCount: gymDays.length,
      title: splitLabel,
      detail: `${gymDays.length} gym session za tyzden`,
      focus: getTrainingFocus(day.sport, gymDays.length, gymDayIndex),
    };
  }

  return {
    day,
    gymDaysCount: gymDays.length,
    title: sportLabels[day.sport],
    detail: sportDescriptions[day.sport],
    focus: getTrainingFocus(day.sport, gymDays.length, gymDayIndex),
  };
}

export function getTodayTraining(weeklyPlan: WeeklyPlanDay[]) {
  return getTrainingForDay(weeklyPlan, getTodayId());
}

export function getFitnessStats(weeklyPlan: WeeklyPlanDay[]) {
  return {
    completedSessionsCount: weeklyPlan.filter((day) => day.log.completed).length,
    gymDaysCount: weeklyPlan.filter((day) => day.sport === "gym").length,
    restDaysCount: weeklyPlan.filter((day) => day.sport === "rest").length,
    todayTraining: getTodayTraining(weeklyPlan),
  };
}
