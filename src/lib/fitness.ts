import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarPreferences } from "@/lib/preferences";

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
  templateSport: SportType;
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

export type DatedFitnessPlan = {
  date: string;
  notes: string;
  plannedDurationMinutes: number;
  plannedTime: string;
  sport: SportType;
};

export type FitnessPlanVersion = Omit<DatedFitnessPlan, "date"> & {
  effectiveFrom: string;
  weekday: WeekdayId;
};

type DbFitnessPlanDay = {
  weekday: string;
  sport: string;
  planned_time: string | null;
  planned_duration_minutes: number;
  notes: string | null;
};

type DbFitnessPlanVersion = DbFitnessPlanDay & {
  effective_from: string;
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
  mobility: "Mobility",
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

export function getWeekdayOrder(
  weekStartsOn: CalendarPreferences["weekStartsOn"] = "monday",
) {
  return weekStartsOn === "sunday"
    ? [weekdayOrder[6], ...weekdayOrder.slice(0, 6)]
    : [...weekdayOrder];
}

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
  createDefaultDay("tuesday", "rest"),
  createDefaultDay("wednesday", "cardio"),
  createDefaultDay("thursday", "rest"),
  createDefaultDay("friday", "mobility"),
  createDefaultDay("saturday", "rest"),
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
    templateSport: sport,
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

export function getWeekDateKeys(
  today: string,
  weekStartsOn: CalendarPreferences["weekStartsOn"] = "monday",
) {
  const date = new Date(`${today}T12:00:00Z`);
  const weekStart = new Date(date);
  const firstDay = weekStartsOn === "sunday" ? 0 : 1;
  weekStart.setUTCDate(
    date.getUTCDate() - ((date.getUTCDay() - firstDay + 7) % 7),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function getWeekdayForDate(date: string): WeekdayId {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? "sunday" : weekdayOrder[day - 1];
}

export function getDateForWeekday(
  today: string,
  weekday: WeekdayId,
  weekStartsOn: CalendarPreferences["weekStartsOn"] = "monday",
) {
  return (
    getWeekDateKeys(today, weekStartsOn).find(
      (date) => getWeekdayForDate(date) === weekday,
    ) ?? today
  );
}

export function mapDbFitnessDay(
  day: DbFitnessPlanDay,
  date: string,
  session?: FitnessSession,
  datedPlan?: DatedFitnessPlan,
): WeeklyPlanDay {
  const id = toWeekday(day.weekday);
  const plannedDurationMinutes =
    datedPlan?.plannedDurationMinutes ?? day.planned_duration_minutes;
  const plannedTime =
    datedPlan?.plannedTime ?? day.planned_time?.slice(0, 5) ?? "";
  const plannedNotes = datedPlan?.notes ?? day.notes ?? "";

  return {
    date,
    id,
    ...weekdayMeta[id],
    plannedDurationMinutes,
    plannedTime,
    sport: datedPlan?.sport ?? toSport(day.sport),
    templateSport: toSport(day.sport),
    log: {
      completed: session?.completed ?? false,
      time: session?.time ?? plannedTime,
      durationMinutes:
        session?.durationMinutes ?? plannedDurationMinutes,
      quality: session?.quality ?? "medium",
      notes: session?.notes ?? plannedNotes,
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

export async function getFitnessPlanHistory(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string,
) {
  if (!from || !to || from >= to) return [] satisfies DatedFitnessPlan[];

  const { data, error } = await supabase
    .from("fitness_plan_versions")
    .select(
      "weekday,effective_from,sport,planned_time,planned_duration_minutes,notes",
    )
    .eq("user_id", userId)
    .lte("effective_from", shiftDate(to, -1))
    .order("effective_from", { ascending: true });

  if (error) throw new Error(error.message);

  const versions: FitnessPlanVersion[] = (data ?? []).map((item) => {
    const row = item as DbFitnessPlanVersion;
    return {
      effectiveFrom: row.effective_from,
      notes: row.notes ?? "",
      plannedDurationMinutes: row.planned_duration_minutes,
      plannedTime: row.planned_time?.slice(0, 5) ?? "",
      sport: toSport(row.sport),
      weekday: toWeekday(row.weekday),
    };
  });
  if (versions.length === 0) return [];
  return resolveFitnessPlanHistory(versions, from, to);
}

export function resolveFitnessPlanHistory(
  versions: FitnessPlanVersion[],
  from: string,
  to: string,
) {
  const datedPlan: DatedFitnessPlan[] = [];
  for (let date = from; date < to; date = shiftDate(date, 1)) {
    const weekday = getWeekdayForDate(date);
    let selected = versions.find(
      (version) =>
        version.weekday === weekday && version.effectiveFrom <= date,
    );
    for (const version of versions) {
      if (version.weekday === weekday && version.effectiveFrom <= date) {
        selected = version;
      }
    }
    const fallback = defaultWeeklyPlan.find((day) => day.id === weekday)!;
    datedPlan.push({
      date,
      notes: selected?.notes ?? fallback.log.notes,
      plannedDurationMinutes:
        selected?.plannedDurationMinutes ?? fallback.plannedDurationMinutes,
      plannedTime: selected?.plannedTime ?? fallback.plannedTime,
      sport: selected?.sport ?? fallback.sport,
    });
  }

  return datedPlan;
}

export async function ensureFitnessPlan(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  weekStartsOn: CalendarPreferences["weekStartsOn"] = "monday",
) {
  const orderedWeekdays = getWeekdayOrder(weekStartsOn);
  const weekDates = getWeekDateKeys(today, weekStartsOn);
  const [planResult, sessions, datedPlan] = await Promise.all([
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
    getFitnessPlanHistory(
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
    return orderedWeekdays.map((weekday, index) => {
      const row = mapped.find((day) => day.weekday === weekday);
      const session = sessions.find(
        (item) => item.performedOn === weekDates[index],
      );
      const planned = datedPlan.find((item) => item.date === weekDates[index]);
      if (row) {
        return mapDbFitnessDay(row, weekDates[index], session, planned);
      }

      const fallback = defaultWeeklyPlan.find((day) => day.id === weekday)!;
      return { ...fallback, date: weekDates[index], log: { ...fallback.log } };
    });
  }

  return null;
}

export function createUnconfiguredWeeklyPlan(
  today: string,
  weekStartsOn: CalendarPreferences["weekStartsOn"] = "monday",
) {
  const orderedWeekdays = getWeekdayOrder(weekStartsOn);
  const weekDates = getWeekDateKeys(today, weekStartsOn);

  return orderedWeekdays.map((weekday, index) => ({
    ...createDefaultDay(weekday, "rest"),
    date: weekDates[index],
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

  return focusBySplit[split] ?? "Strength training based on the current split.";
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
      detail: `${gymDays.length} gym session${gymDays.length === 1 ? "" : "s"} this week`,
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

export function getFitnessStats(
  weeklyPlan: WeeklyPlanDay[],
  today?: string,
  configured = true,
) {
  const todayTraining = getTodayTraining(weeklyPlan, today);
  return {
    completedSessionsCount: weeklyPlan.filter((day) => day.log.completed).length,
    gymDaysCount: weeklyPlan.filter((day) => day.sport === "gym").length,
    restDaysCount: weeklyPlan.filter((day) => day.sport === "rest").length,
    todayTraining: configured
      ? todayTraining
      : {
          ...todayTraining,
          detail: "Choose a reviewed starter plan before training is scheduled.",
          focus: "No fitness plan is active yet.",
          title: "Set up Fitness",
        },
  };
}

/**
 * Marks one day's session done or not, touching nothing else about it.
 *
 * Three server actions carried their own copy of read-then-branch for this,
 * and every copy raced: two writers could both see "no row" and both insert,
 * and the second died on the unique constraint with an error none of them
 * handled. A blind upsert is not the fix — it would clobber the duration and
 * quality of a session that was already logged in full, which is exactly why
 * the copies were written read-then-branch in the first place.
 *
 * So: update first, and only if no row moved, insert the seed. If the insert
 * loses the race (23505), the row exists now, and the update that follows is
 * the write we wanted all along.
 */
export async function setSessionCompletion(
  supabase: SupabaseClient,
  userId: string,
  performedOn: string,
  completed: boolean,
  seed: {
    durationMinutes: number;
    notes?: string;
    performedAt?: string | null;
    quality: TrainingQuality;
    sport: SportType;
  },
): Promise<{ code?: string; message: string } | null> {
  const update = () =>
    supabase
      .from("fitness_sessions")
      .update({ completed })
      .eq("user_id", userId)
      .eq("performed_on", performedOn)
      .select("id");

  const updated = await update();
  if (updated.error) {
    return { code: updated.error.code, message: updated.error.message };
  }
  if ((updated.data ?? []).length > 0) return null;

  const inserted = await supabase.from("fitness_sessions").insert({
    completed,
    duration_minutes: seed.durationMinutes,
    notes: seed.notes ?? "",
    performed_at: seed.performedAt || null,
    performed_on: performedOn,
    quality: seed.quality,
    sport: seed.sport,
    user_id: userId,
  });
  if (!inserted.error) return null;

  if (inserted.error.code === "23505") {
    const retried = await update();
    if (retried.error) {
      return { code: retried.error.code, message: retried.error.message };
    }
    return null;
  }

  return { code: inserted.error.code, message: inserted.error.message };
}
