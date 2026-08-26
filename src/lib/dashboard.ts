import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DatedFitnessPlan,
  FitnessSession,
  TodayTraining,
} from "@/lib/fitness";
import { getWeekDateKeys, shiftDate } from "@/lib/fitness";
import type { FinanceTransaction } from "@/lib/finance";
import type { CalendarPreferences } from "@/lib/preferences";
import type { Task, TaskCompletion } from "@/lib/tasks";
import { getDateInTimeZone, getTaskDayStatus } from "@/lib/tasks";
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

export type DailyRings = {
  finance: DailyRingMetric;
  fitness: DailyRingMetric;
  tasks: DailyRingMetric;
};

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
  training: TodayTraining,
  transactions: FinanceTransaction[],
  today: string,
  timeZone: CalendarPreferences["timeZone"],
): DailyRings {
  const dailyTasks = tasks.filter(
    (task) => getTaskDayStatus(task, today, timeZone) !== "scheduled",
  );
  const todayTransactions = transactions.filter(
    (transaction) => transaction.date === today,
  );
  const fitnessTotal = training.day.sport === "rest" ? 0 : 1;

  return {
    finance: toRingMetric(
      todayTransactions.filter((transaction) => transaction.status === "paid")
        .length,
      todayTransactions.length,
    ),
    fitness: toRingMetric(
      fitnessTotal && training.day.log.completed ? 1 : 0,
      fitnessTotal,
    ),
    tasks: toRingMetric(
      dailyTasks.filter((task) => task.completed).length,
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

function plannedTaskIds(
  tasks: Task[],
  completions: TaskCompletion[],
  date: string,
  timeZone: CalendarPreferences["timeZone"],
) {
  const tasksWithCompletionHistory = new Set(
    completions.map((completion) => completion.taskId),
  );
  const ids = new Set(
    tasks
      .filter((task) => {
        if (task.dueDate) return task.dueDate === date;
        if (tasksWithCompletionHistory.has(task.id)) return false;
        const created = getDateInTimeZone(task.createdAt ?? "", timeZone);
        return created === date;
      })
      .map((task) => task.id),
  );
  for (const completion of completions) {
    if (completion.plannedFor === date) ids.add(completion.taskId);
  }
  return ids;
}

function pointForDate(
  date: string,
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  plan: DatedFitnessPlan[],
  today: string,
  allowFuture: boolean,
  calendar: CalendarPreferences,
): ProductivityPoint {
  const dayPlan = plan.find((day) => day.date === date);
  const plannedIds = plannedTaskIds(
    tasks,
    completions,
    date,
    calendar.timeZone,
  );
  const dayCompletions = completions.filter(
    (completion) => completionDate(completion, calendar.timeZone) === date,
  );
  const completedIds = new Set(dayCompletions.map((completion) => completion.taskId));
  const plannedTasks = Math.max(plannedIds.size, completedIds.size);
  const completedTasks = completedIds.size;
  const plannedFitness = dayPlan?.sport && dayPlan.sport !== "rest" ? 1 : 0;
  const completedFitness = sessions.some(
    (session) => session.performedOn === date && session.completed,
  )
    ? 1
    : 0;
  const focusMinutes = dayCompletions.reduce(
    (total, completion) => total + completion.estimateMinutes,
    0,
  );
  const future = allowFuture && date > today;
  const taskRatio = plannedTasks ? Math.min(1, completedTasks / plannedTasks) : 0;
  const fitnessRatio = plannedFitness ? completedFitness : 0;
  const focusRatio = Math.min(1, focusMinutes / 120);

  return {
    completedFitness,
    completedTasks,
    date,
    focusMinutes,
    future,
    label: new Intl.DateTimeFormat("en", {
      timeZone: "UTC",
      weekday: "short",
    }).format(new Date(`${date}T12:00:00Z`)),
    plannedFitness,
    plannedTasks,
    score: future
      ? null
      : Math.round(taskRatio * 60 + fitnessRatio * 25 + focusRatio * 15),
  };
}

export function getProductivityWeeks(
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  plan: DatedFitnessPlan[],
  today: string,
  calendar: CalendarPreferences,
) {
  const currentDates = getWeekDateKeys(today, calendar.weekStartsOn);
  const previousDates = currentDates.map((date) => shiftDate(date, -7));

  return {
    current: currentDates.map((date) =>
      pointForDate(
        date,
        tasks,
        completions,
        sessions,
        plan,
        today,
        true,
        calendar,
      ),
    ),
    previous: previousDates.map((date) =>
      pointForDate(
        date,
        tasks,
        completions,
        sessions,
        plan,
        today,
        false,
        calendar,
      ),
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
): ProductivityPoint[] {
  return Array.from({ length: days }, (_, index) =>
    shiftDate(today, index - days + 1),
  ).map((date) =>
    pointForDate(date, tasks, completions, sessions, plan, today, false, calendar),
  );
}

export function getProductivityRange(
  tasks: Task[],
  completions: TaskCompletion[],
  sessions: FitnessSession[],
  plan: DatedFitnessPlan[],
  today: string,
  days: 7 | 30,
  calendar: CalendarPreferences,
) {
  const currentDates = Array.from({ length: days }, (_, index) =>
    shiftDate(today, index - days + 1),
  );
  const previousDates = currentDates.map((date) => shiftDate(date, -days));

  return {
    current: currentDates.map((date) =>
      pointForDate(
        date,
        tasks,
        completions,
        sessions,
        plan,
        today,
        false,
        calendar,
      ),
    ),
    previous: previousDates.map((date) =>
      pointForDate(
        date,
        tasks,
        completions,
        sessions,
        plan,
        today,
        false,
        calendar,
      ),
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
  const plannedIds = new Set<string>();
  for (const date of dates) {
    for (const id of plannedTaskIds(
      tasks,
      completions,
      date,
      calendar.timeZone,
    )) {
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
