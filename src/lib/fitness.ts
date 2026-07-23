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
  sport: Exclude<SportType, "rest"> | null;
};

export type WeeklyPlanDay = {
  date: string;
  id: WeekdayId;
  label: string;
  plannedDurationMinutes: number;
  plannedTime: string;
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

export type FitnessSession = {
  completed: boolean;
  durationMinutes: number;
  notes: string;
  performedOn: string;
  quality: TrainingQuality;
  sport: Exclude<SportType, "rest">;
  time: string;
};

type DbFitnessPlanDay = {
  weekday: string;
  sport: string;
  planned_time: string | null;
  planned_duration_minutes: number;
  notes: string | null;
};

type DbFitnessSession = {
  completed: boolean;
  duration_minutes: number;
  notes: string | null;
  performed_on: string;
  quality: string | null;
  sport: string;
  performed_at: string | null;
};

export const sportLabels: Record<SportType, string> = {
  gym: "Gym",
  tennis: "Tennis",
  cardio: "Cardio",
  mobility: "Mobilita",
  rest: "Rest",
};

export const sportDescriptions: Record<SportType, string> = {
  gym: "Strength training based on the current weekly split.",
  tennis: "Technique, movement, and coordination.",
  cardio: "Conditioning, aerobic work, and endurance.",
  mobility: "Mobility, stretching, and controlled movement.",
  rest: "Recovery, sleep, and preparation for the next session.",
};

export const qualityLabels: Record<TrainingQuality, string> = {
  low: "Difficult",
  medium: "Steady",
  high: "Strong",
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
  monday: { label: "Monday", shortLabel: "Mon" },
  tuesday: { label: "Tuesday", shortLabel: "Tue" },
  wednesday: { label: "Wednesday", shortLabel: "Wed" },
  thursday: { label: "Thursday", shortLabel: "Thu" },
  friday: { label: "Friday", shortLabel: "Fri" },
  saturday: { label: "Saturday", shortLabel: "Sat" },
  sunday: { label: "Sunday", shortLabel: "Sun" },
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
    sport: null,
  };
}

function createDefaultDay(id: WeekdayId, sport: SportType): WeeklyPlanDay {
  return {
    date: "",
    id,
    ...weekdayMeta[id],
    plannedDurationMinutes: 60,
    plannedTime: "",
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

export function getWeekDateKeys(today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function getDateForWeekday(today: string, weekday: WeekdayId) {
  return getWeekDateKeys(today)[weekdayOrder.indexOf(weekday)];
}

export function mapDbFitnessDay(
  day: DbFitnessPlanDay,
  date: string,
  session?: FitnessSession,
): WeeklyPlanDay {
  const id = toWeekday(day.weekday);

  return {
    date,
    id,
    ...weekdayMeta[id],
    plannedDurationMinutes: day.planned_duration_minutes,
    plannedTime: day.planned_time?.slice(0, 5) ?? "",
    sport: toSport(day.sport),
    log: {
      completed: session?.completed ?? false,
      time: session?.time ?? day.planned_time?.slice(0, 5) ?? "",
      durationMinutes:
        session?.durationMinutes ?? day.planned_duration_minutes,
      quality: session?.quality ?? "medium",
      notes: session?.notes ?? day.notes ?? "",
      sport: session?.sport ?? null,
    },
  };
}

export async function getFitnessSessions(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase
    .from("fitness_sessions")
    .select(
      "performed_on,sport,completed,performed_at,duration_minutes,quality,notes",
    )
    .eq("user_id", userId)
    .gte("performed_on", from)
    .lt("performed_on", to)
    .order("performed_on", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((session) => {
    const row = session as DbFitnessSession;
    return {
      completed: row.completed,
      durationMinutes: row.duration_minutes,
      notes: row.notes ?? "",
      performedOn: row.performed_on,
      quality: toQuality(row.quality),
      sport: toSport(row.sport) as Exclude<SportType, "rest">,
      time: row.performed_at?.slice(0, 5) ?? "",
    } satisfies FitnessSession;
  });
}

export async function ensureFitnessPlan(
  supabase: SupabaseClient,
  userId: string,
  today: string,
) {
  const weekDates = getWeekDateKeys(today);
  const [planResult, sessions] = await Promise.all([
    supabase
      .from("fitness_plan_days")
      .select("weekday,sport,planned_time,planned_duration_minutes,notes")
      .eq("user_id", userId)
      .order("weekday"),
    getFitnessSessions(
      supabase,
      userId,
      weekDates[0],
      shiftDate(weekDates[6], 1),
    ),
  ]);

  if (planResult.error) {
    throw new Error(planResult.error.message);
  }

  if (planResult.data && planResult.data.length > 0) {
    const mapped = planResult.data.map((day) => day as DbFitnessPlanDay);
    return weekdayOrder.map((weekday, index) => {
      const row = mapped.find((day) => day.weekday === weekday);
      const session = sessions.find(
        (item) => item.performedOn === weekDates[index],
      );
      if (row) return mapDbFitnessDay(row, weekDates[index], session);

      const fallback = defaultWeeklyPlan.find((day) => day.id === weekday)!;
      return { ...fallback, date: weekDates[index], log: { ...fallback.log } };
    });
  }

  const rows = defaultWeeklyPlan.map((day) => ({
    user_id: userId,
    weekday: day.id,
    sport: day.sport,
    planned_time: day.plannedTime || null,
    planned_duration_minutes: day.plannedDurationMinutes,
    notes: day.log.notes,
  }));

  const { error: insertError } = await supabase.from("fitness_plan_days").insert(rows);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return defaultWeeklyPlan.map((day, index) => ({
    ...day,
    date: weekDates[index],
    log: { ...day.log },
  }));
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

export function getTodayTraining(weeklyPlan: WeeklyPlanDay[], today?: string) {
  const day = today ? weeklyPlan.find((item) => item.date === today) : null;
  return getTrainingForDay(weeklyPlan, day?.id ?? getTodayId());
}

export function getFitnessStats(weeklyPlan: WeeklyPlanDay[], today?: string) {
  return {
    completedSessionsCount: weeklyPlan.filter((day) => day.log.completed).length,
    gymDaysCount: weeklyPlan.filter((day) => day.sport === "gym").length,
    restDaysCount: weeklyPlan.filter((day) => day.sport === "rest").length,
    todayTraining: getTodayTraining(weeklyPlan, today),
  };
}
