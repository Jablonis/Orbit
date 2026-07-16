import type { SupabaseClient } from "@supabase/supabase-js";
import type { FitnessSession, WeeklyPlanDay } from "@/lib/fitness";
import { getWeekDateKeys, shiftDate } from "@/lib/fitness";
import type { FinanceTransaction } from "@/lib/finance";
import type { Task, TaskCompletion } from "@/lib/tasks";
import { getDateInTimeZone } from "@/lib/tasks";

export type ProductivityPoint = {
  completedFitness: number;
  completedTasks: number;
  date: string;
  focusMinutes: number;
  future: boolean;
  label: string;
  plannedFitness: number;
  plannedTasks: number;
  score: number | null;
};

export type ProductivityDomain = "tasks" | "fitness" | "focus";

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

function completionDate(completion: TaskCompletion) {
  return getDateInTimeZone(completion.completedAt);
}

function plannedTaskIds(tasks: Task[], completions: TaskCompletion[], date: string) {
  const ids = new Set(
    tasks
      .filter((task) => {
        const created = getDateInTimeZone(task.createdAt ?? "");
        return task.dueDate === date || (!task.dueDate && created === date);
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
  plan: WeeklyPlanDay[],
  today: string,
  allowFuture: boolean,
): ProductivityPoint {
  const weekdayIndex = getWeekDateKeys(date).indexOf(date);
  const dayPlan = plan[weekdayIndex];
  const plannedIds = plannedTaskIds(tasks, completions, date);
  const dayCompletions = completions.filter(
    (completion) => completionDate(completion) === date,
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
  plan: WeeklyPlanDay[],
  today: string,
) {
  const currentDates = getWeekDateKeys(today);
  const previousDates = currentDates.map((date) => shiftDate(date, -7));

  return {
    current: currentDates.map((date) =>
      pointForDate(date, tasks, completions, sessions, plan, today, true),
    ),
    previous: previousDates.map((date) =>
      pointForDate(date, tasks, completions, sessions, plan, today, false),
    ),
  };
}

export function rescoreProductivity(
  productivity: ReturnType<typeof getProductivityWeeks>,
  enabledDomains: ProductivityDomain[],
) {
  const weights: Record<ProductivityDomain, number> = {
    fitness: 25,
    focus: 15,
    tasks: 60,
  };
  const enabledWeight = enabledDomains.reduce(
    (total, domain) => total + weights[domain],
    0,
  );
  const rescore = (point: ProductivityPoint): ProductivityPoint => {
    if (point.future) return { ...point, score: null };
    const ratios: Record<ProductivityDomain, number> = {
      fitness: point.plannedFitness ? point.completedFitness : 0,
      focus: Math.min(1, point.focusMinutes / 120),
      tasks: point.plannedTasks
        ? Math.min(1, point.completedTasks / point.plannedTasks)
        : 0,
    };
    const weighted = enabledDomains.reduce(
      (total, domain) => total + ratios[domain] * weights[domain],
      0,
    );
    return {
      ...point,
      score: enabledWeight ? Math.round((weighted / enabledWeight) * 100) : 0,
    };
  };

  return {
    current: productivity.current.map(rescore),
    previous: productivity.previous.map(rescore),
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
): WeeklyReview {
  const dates = getWeekDateKeys(today);
  const weekStart = dates[0];
  const weekEnd = dates[6];
  const plannedIds = new Set<string>();
  for (const date of dates) {
    for (const id of plannedTaskIds(tasks, completions, date)) plannedIds.add(id);
  }
  const weekCompletions = completions.filter((completion) => {
    const date = completionDate(completion);
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
