import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DatedFitnessPlan,
  FitnessSession,
  TodayTraining,
} from "@/lib/fitness";
import { getWeekDateKeys, shiftDate } from "@/lib/fitness";
import type { FinanceTransaction } from "@/lib/finance";
import type { CalendarPreferences } from "@/lib/preferences";
import type { Habit, HabitCheck } from "@/lib/habits";
import { getHabitRing, isHabitDoneOn, isHabitDueOn } from "@/lib/habits";
import type { Task, TaskCompletion } from "@/lib/tasks";
import { getDateInTimeZone, getTaskDayStatus, isRepeating } from "@/lib/tasks";
import { getDayTasks, isRoutineDueOn } from "@/lib/routines";
import type { ProductivityPoint } from "@/lib/productivity-score";
export {
  type ProductivityDomain,
  type ProductivityPoint,
  rescoreProductivity,
} from "@/lib/productivity-score";

export type DailyRingMetric = {
  completed: number;
  percent: number;
  total: number;
};

/**
 * The day is what you asked of yourself, and money is not that: a month is
 * either balanced or it is not, and there is nothing to do about it on a
 * Tuesday. Finance keeps its page; it stopped being a ring.
 */
export type DailyRings = {
  fitness: DailyRingMetric;
  habits: DailyRingMetric;
  tasks: DailyRingMetric;
};

/**
 * The habits a day is measured against. Passed as one bundle and defaulted to
 * empty, because habits arrived after the scoring engine did: an account with
 * none — or a caller that has not loaded them — scores exactly as it did
 * before the pillar existed.
 */
export type HabitInputs = {
  checks: HabitCheck[];
  habits: Habit[];
};

const noHabits: HabitInputs = { checks: [], habits: [] };

export type WeeklyReflection = {
  changeNextWeek: string;
  whatWorked: string;
};

export type WeeklyReview = {
  completedTasks: number;
  expenses: number;
  income: number;
  overdueCarried: number;
  plannedTasks: number;
  previousScore: number;
  savingsRate: number;
  score: number;
  sessionMinutes: number;
  sessions: number;
};

function toRingMetric(completed: number, total: number): DailyRingMetric {
  return {
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    total,
  };
}

export function getDailyRings(
  tasks: Task[],
  completions: TaskCompletion[],
  training: TodayTraining,
  today: string,
  timeZone: CalendarPreferences["timeZone"],
  habits: HabitInputs = noHabits,
): DailyRings {
  // A routine is done for a date rather than for good, so the ring reads the
  // completions for today instead of the flag on the task.
  const dailyTasks = getDayTasks(tasks, completions, today, timeZone).filter(
    (entry) => getTaskDayStatus(entry.task, today, timeZone) !== "scheduled",
  );
  const fitnessTotal = training.day.sport === "rest" ? 0 : 1;

  const habitRing = getHabitRing(
    habits.habits,
    habits.checks,
    today,
    timeZone,
  );

  return {
    fitness: toRingMetric(
      fitnessTotal && training.day.log.completed ? 1 : 0,
      fitnessTotal,
    ),
    habits: toRingMetric(habitRing.completed, habitRing.total),
    tasks: toRingMetric(
      dailyTasks.filter((entry) => entry.done).length,
      dailyTasks.length,
    ),
  };
}

function completionDate(
  completion: TaskCompletion,
  timeZone: CalendarPreferences["timeZone"],
) {
  return getDateInTimeZone(completion.completedAt, timeZone);
}

/**
 * Everything the per-day scorer needs, computed once per batch.
 *
 * `pointForDate` used to rescan every array it was handed — a `.find` over a
 * 730-element plan, a filter over every completion, a Set rebuilt from
 * scratch — and the Overview calls it ~864 times per load, 730 of them for
 * the voyage. The scans made the page quadratic in account age. The answers
 * do not change within a batch, so they are indexed once and looked up.
 */
type DayIndex = {
  completionsByDay: Map<string, TaskCompletion[]>;
  createdByDay: Map<string, string[]>;
  dueByDay: Map<string, string[]>;
  planByDate: Map<string, DatedFitnessPlan>;
  plannedForByDay: Map<string, string[]>;
  routines: Task[];
  sessionDoneDays: Set<string>;
};

function buildDayIndex(
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  plan: DatedFitnessPlan[],
  timeZone: CalendarPreferences["timeZone"],
): DayIndex {
  const withHistory = new Set(completions.map((completion) => completion.taskId));
  const completionsByDay = new Map<string, TaskCompletion[]>();
  const plannedForByDay = new Map<string, string[]>();
  for (const completion of completions) {
    const day = completionDate(completion, timeZone);
    const bucket = completionsByDay.get(day);
    if (bucket) bucket.push(completion);
    else completionsByDay.set(day, [completion]);
    if (completion.plannedFor) {
      const planned = plannedForByDay.get(completion.plannedFor);
      if (planned) planned.push(completion.taskId);
      else plannedForByDay.set(completion.plannedFor, [completion.taskId]);
    }
  }

  const createdByDay = new Map<string, string[]>();
  const dueByDay = new Map<string, string[]>();
  const routines: Task[] = [];
  for (const task of tasks) {
    if (isRepeating(task)) {
      routines.push(task);
      continue;
    }
    if (task.dueDate) {
      const due = dueByDay.get(task.dueDate);
      if (due) due.push(task.id);
      else dueByDay.set(task.dueDate, [task.id]);
      continue;
    }
    if (withHistory.has(task.id)) continue;
    const created = getDateInTimeZone(task.createdAt ?? "", timeZone);
    if (!created) continue;
    const bucket = createdByDay.get(created);
    if (bucket) bucket.push(task.id);
    else createdByDay.set(created, [task.id]);
  }

  return {
    completionsByDay,
    createdByDay,
    dueByDay,
    planByDate: new Map(plan.map((day) => [day.date, day])),
    plannedForByDay,
    routines,
    sessionDoneDays: new Set(
      sessions
        .filter((session) => session.completed)
        .map((session) => session.performedOn),
    ),
  };
}

/** The same question `plannedTaskIds` answered, from the index. */
function plannedIdsOn(index: DayIndex, date: string, timeZone: string) {
  const ids = new Set<string>([
    ...(index.dueByDay.get(date) ?? []),
    ...(index.createdByDay.get(date) ?? []),
    ...(index.plannedForByDay.get(date) ?? []),
  ]);
  // A routine is planned for every day it repeats onto, which is the whole
  // point of writing it down once. Few tasks repeat, so this stays linear in
  // routines, not in the account.
  for (const task of index.routines) {
    if (isRoutineDueOn(task, date, timeZone)) ids.add(task.id);
  }
  return ids;
}

function pointForDate(
  date: string,
  index: DayIndex,
  today: string,
  allowFuture: boolean,
  calendar: CalendarPreferences,
  habitInputs: HabitInputs,
): ProductivityPoint {
  const dayPlan = index.planByDate.get(date);
  const plannedIds = plannedIdsOn(index, date, calendar.timeZone);
  const dayCompletions = index.completionsByDay.get(date) ?? [];
  const completedIds = new Set(dayCompletions.map((completion) => completion.taskId));
  const plannedTasks = Math.max(plannedIds.size, completedIds.size);
  const completedTasks = completedIds.size;
  const plannedFitness = dayPlan?.sport && dayPlan.sport !== "rest" ? 1 : 0;
  const completedFitness = index.sessionDoneDays.has(date) ? 1 : 0;
  const focusMinutes = dayCompletions.reduce(
    (total, completion) => total + completion.estimateMinutes,
    0,
  );
  const dueHabits = habitInputs.habits.filter((habit) =>
    isHabitDueOn(habit, date, calendar.timeZone),
  );
  const plannedHabits = dueHabits.length;
  const completedHabits = dueHabits.filter((habit) =>
    isHabitDoneOn(habitInputs.checks, habit.id, date),
  ).length;
  const future = allowFuture && date > today;
  const taskRatio = plannedTasks ? Math.min(1, completedTasks / plannedTasks) : 0;
  const fitnessRatio = plannedFitness ? completedFitness : 0;
  const focusRatio = Math.min(1, focusMinutes / 120);
  const habitRatio = plannedHabits ? completedHabits / plannedHabits : 0;
  // The unweighted seed the chart draws before `rescoreProductivity` asks the
  // real engine. Habits only take a share of the day on the days they are
  // asked for, so a day with none scores exactly as it always did.
  const habitWeight = plannedHabits ? 25 : 0;
  const totalWeight = 60 + 25 + 15 + habitWeight;

  return {
    completedFitness,
    completedHabits,
    completedTasks,
    date,
    focusMinutes,
    future,
    label: new Intl.DateTimeFormat("en", {
      timeZone: "UTC",
      weekday: "short",
    }).format(new Date(`${date}T12:00:00Z`)),
    plannedFitness,
    plannedHabits,
    plannedTasks,
    score: future
      ? null
      : Math.round(
          ((taskRatio * 60 +
            fitnessRatio * 25 +
            focusRatio * 15 +
            habitRatio * habitWeight) /
            totalWeight) *
            100,
        ),
  };
}

export function getProductivityWeeks(
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  plan: DatedFitnessPlan[],
  today: string,
  calendar: CalendarPreferences,
  habits: HabitInputs = noHabits,
) {
  const currentDates = getWeekDateKeys(today, calendar.weekStartsOn);
  const previousDates = currentDates.map((date) => shiftDate(date, -7));
  const index = buildDayIndex(tasks, completions, sessions, plan, calendar.timeZone);

  return {
    current: currentDates.map((date) =>
      pointForDate(date, index, today, true, calendar, habits),
    ),
    previous: previousDates.map((date) =>
      pointForDate(date, index, today, false, calendar, habits),
    ),
  };
}

/**
 * One point per day over a long window, oldest first, with no comparison
 * window behind it. The voyage needs the whole account rather than a rolling
 * thirty days, and scoring twice as many days to throw half of them away is
 * the kind of cost that only shows up on somebody else's phone.
 */
export function getProductivityHistory(
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  plan: DatedFitnessPlan[],
  today: string,
  days: number,
  calendar: CalendarPreferences,
  habits: HabitInputs = noHabits,
): ProductivityPoint[] {
  const index = buildDayIndex(tasks, completions, sessions, plan, calendar.timeZone);
  return Array.from({ length: days }, (_, offset) =>
    shiftDate(today, offset - days + 1),
  ).map((date) => pointForDate(date, index, today, false, calendar, habits));
}

export function getProductivityRange(
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  plan: DatedFitnessPlan[],
  today: string,
  days: 7 | 30,
  calendar: CalendarPreferences,
  habits: HabitInputs = noHabits,
) {
  const currentDates = Array.from({ length: days }, (_, offset) =>
    shiftDate(today, offset - days + 1),
  );
  const previousDates = currentDates.map((date) => shiftDate(date, -days));
  const index = buildDayIndex(tasks, completions, sessions, plan, calendar.timeZone);

  return {
    current: currentDates.map((date) =>
      pointForDate(date, index, today, false, calendar, habits),
    ),
    previous: previousDates.map((date) =>
      pointForDate(date, index, today, false, calendar, habits),
    ),
  };
}

function averageScore(points: ProductivityPoint[]) {
  const values = points.flatMap((point) =>
    point.score === null ? [] : [point.score],
  );
  return values.length
    ? Math.round(values.reduce((total, score) => total + score, 0) / values.length)
    : 0;
}

export function getWeeklyReview(
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  transactions: FinanceTransaction[],
  productivity: ReturnType<typeof getProductivityWeeks>,
  today: string,
  calendar: CalendarPreferences,
): WeeklyReview {
  const dates = getWeekDateKeys(today, calendar.weekStartsOn);
  const weekStart = dates[0];
  const weekEnd = dates[6];
  const index = buildDayIndex(tasks, completions, [], [], calendar.timeZone);
  const plannedIds = new Set<string>();
  for (const date of dates) {
    for (const id of plannedIdsOn(index, date, calendar.timeZone)) {
      plannedIds.add(id);
    }
  }
  const weekCompletions = completions.filter((completion) => {
    const date = completionDate(completion, calendar.timeZone);
    return date >= weekStart && date <= weekEnd;
  });
  const completedIds = new Set(weekCompletions.map((item) => item.taskId));
  const weekSessions = sessions.filter(
    (session) =>
      session.performedOn >= weekStart &&
      session.performedOn <= weekEnd &&
      session.completed,
  );
  const paid = transactions.filter(
    (transaction) =>
      transaction.status === "paid" &&
      transaction.date >= weekStart &&
      transaction.date <= weekEnd,
  );
  const income = paid
    .filter((transaction) => transaction.amount > 0)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = Math.abs(
    paid
      .filter((transaction) => transaction.amount < 0)
      .reduce((total, transaction) => total + transaction.amount, 0),
  );

  return {
    completedTasks: completedIds.size,
    expenses,
    income,
    overdueCarried: tasks.filter(
      (task) => !task.completed && Boolean(task.dueDate) && task.dueDate < today,
    ).length,
    plannedTasks: Math.max(plannedIds.size, completedIds.size),
    previousScore: averageScore(productivity.previous),
    savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
    score: averageScore(productivity.current),
    sessionMinutes: weekSessions.reduce(
      (total, session) => total + session.durationMinutes,
      0,
    ),
    sessions: weekSessions.length,
  };
}

export async function getWeeklyReflection(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string,
) {
  const { data, error } = await supabase
    .from("weekly_reflections")
    .select("what_worked,change_next_week")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    changeNextWeek: data?.change_next_week ?? "",
    whatWorked: data?.what_worked ?? "",
  } satisfies WeeklyReflection;
}
