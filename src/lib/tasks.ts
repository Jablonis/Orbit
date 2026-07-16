import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskType = "deep-work" | "admin" | "learning" | "personal";
export type TaskComplexity = "easy" | "medium" | "hard";
export type TaskPriority = "low" | "normal" | "high";
export type TaskEstimateMode = "1hr" | "2hr" | "3hr" | "other";
export type TaskDayStatus = "completed" | "overdue" | "scheduled" | "today";

export const taskTimeZone = "Europe/Bratislava";

export type Task = {
  id: string;
  title: string;
  category: string;
  type: TaskType;
  complexity: TaskComplexity;
  priority: TaskPriority;
  estimateMode: TaskEstimateMode;
  estimateMinutes: number;
  timeFrom: string;
  timeTo: string;
  dueDate: string;
  note: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TaskInput = Omit<
  Task,
  "id" | "completed" | "completedAt" | "createdAt" | "updatedAt"
> & {
  completed?: boolean;
};

export type TaskCompletion = {
  completedAt: string;
  estimateMinutes: number;
  plannedFor: string;
  taskId: string;
};

export const taskTypeLabels: Record<TaskType, string> = {
  "deep-work": "Deep work",
  admin: "Admin",
  learning: "Learning",
  personal: "Personal",
};

export const taskComplexityLabels: Record<TaskComplexity, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const taskEstimateLabels: Record<TaskEstimateMode, string> = {
  "1hr": "1 hr",
  "2hr": "2 hr",
  "3hr": "3 hr",
  other: "Other",
};

type DbTask = {
  id: string;
  title: string;
  category: string;
  type: string;
  complexity: string;
  priority: string;
  estimate_mode: string;
  estimate_minutes: number;
  time_from: string | null;
  time_to: string | null;
  due_date: string | null;
  note: string | null;
  completed: boolean;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type DbTaskCompletion = {
  completed_at: string;
  estimate_minutes: number;
  planned_for: string | null;
  task_id: string;
};

export function getMinutesBetweenTimes(timeFrom: string, timeTo: string) {
  if (!timeFrom || !timeTo) {
    return 0;
  }

  const [fromHours, fromMinutes] = timeFrom.split(":").map(Number);
  const [toHours, toMinutes] = timeTo.split(":").map(Number);

  if (
    !Number.isFinite(fromHours) ||
    !Number.isFinite(fromMinutes) ||
    !Number.isFinite(toHours) ||
    !Number.isFinite(toMinutes)
  ) {
    return 0;
  }

  const fromTotal = fromHours * 60 + fromMinutes;
  const toTotal = toHours * 60 + toMinutes;

  return toTotal >= fromTotal ? toTotal - fromTotal : toTotal + 1440 - fromTotal;
}

export function formatMinutes(minutes: number) {
  if (minutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder} min`;
  }

  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

export function formatTaskTime(task: Task) {
  if (task.estimateMode === "other") {
    if (!task.timeFrom || !task.timeTo) {
      return "Custom";
    }

    return `${task.timeFrom}-${task.timeTo} · ${formatMinutes(task.estimateMinutes)}`;
  }

  return taskEstimateLabels[task.estimateMode];
}

export function getDateInTimeZone(
  date: Date | string = new Date(),
  timeZone = taskTimeZone,
) {
  const value = typeof date === "string" ? new Date(date) : date;

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getTaskDayStatus(task: Task, today: string): TaskDayStatus {
  if (task.completed) {
    return "completed";
  }

  const taskDate = task.dueDate || getDateInTimeZone(task.createdAt ?? "");

  if (taskDate && taskDate < today) {
    return "overdue";
  }

  if (task.dueDate && task.dueDate > today) {
    return "scheduled";
  }

  return "today";
}

export function isTaskVisibleToday(task: Task, today: string) {
  if (!task.completed) {
    return true;
  }

  return getDateInTimeZone(task.completedAt ?? "") === today;
}

export function getVisibleTasks(tasks: Task[], today: string) {
  return tasks.filter((task) => isTaskVisibleToday(task, today));
}

export function getMostUsedTaskCategories(tasks: Task[], limit = 6) {
  const categories = new Map<string, { count: number; label: string }>();

  for (const task of tasks) {
    const label = task.category.trim();

    if (!label) {
      continue;
    }

    const key = label.toLocaleLowerCase();
    const category = categories.get(key);
    categories.set(key, {
      count: (category?.count ?? 0) + 1,
      label: category?.label ?? label,
    });
  }

  return [...categories.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((category) => category.label);
}

function toTaskType(value: string): TaskType {
  return value === "admin" || value === "learning" || value === "personal"
    ? value
    : "deep-work";
}

function toTaskComplexity(value: string): TaskComplexity {
  return value === "easy" || value === "hard" ? value : "medium";
}

function toTaskPriority(value: string): TaskPriority {
  return value === "low" || value === "high" ? value : "normal";
}

function toTaskEstimateMode(value: string): TaskEstimateMode {
  return value === "2hr" || value === "3hr" || value === "other" ? value : "1hr";
}

export function mapDbTask(task: DbTask): Task {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    type: toTaskType(task.type),
    complexity: toTaskComplexity(task.complexity),
    priority: toTaskPriority(task.priority),
    estimateMode: toTaskEstimateMode(task.estimate_mode),
    estimateMinutes: task.estimate_minutes,
    timeFrom: task.time_from ?? "",
    timeTo: task.time_to ?? "",
    dueDate: task.due_date ?? "",
    note: task.note ?? "",
    completed: task.completed,
    completedAt: task.completed_at ?? undefined,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

export function toTaskInsert(input: TaskInput, userId: string) {
  return {
    user_id: userId,
    title: input.title,
    category: input.category,
    type: input.type,
    complexity: input.complexity,
    priority: input.priority,
    estimate_mode: input.estimateMode,
    estimate_minutes: input.estimateMinutes,
    time_from: input.timeFrom || null,
    time_to: input.timeTo || null,
    due_date: input.dueDate || null,
    note: input.note,
    completed: Boolean(input.completed),
  };
}

export async function getTasks(
  supabase: SupabaseClient,
  userId: string,
  options: { includeHistory?: boolean; today?: string } = {},
) {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id,title,category,type,complexity,priority,estimate_mode,estimate_minutes,time_from,time_to,due_date,note,completed,completed_at,created_at,updated_at",
    )
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const tasks = (data ?? []).map((task) => mapDbTask(task as DbTask));

  if (options.includeHistory) {
    return tasks;
  }

  return getVisibleTasks(tasks, options.today ?? getDateInTimeZone());
}

export async function getTaskCompletions(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase
    .from("task_completions")
    .select("task_id,completed_at,planned_for,estimate_minutes")
    .eq("user_id", userId)
    .gte("completed_at", `${from}T00:00:00`)
    .lt("completed_at", `${to}T00:00:00`)
    .order("completed_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((completion) => {
    const row = completion as DbTaskCompletion;
    return {
      completedAt: row.completed_at,
      estimateMinutes: row.estimate_minutes,
      plannedFor: row.planned_for ?? "",
      taskId: row.task_id,
    } satisfies TaskCompletion;
  });
}

export function sortDashboardTasks(tasks: Task[], today: string) {
  const rank = (task: Task) => {
    const status = getTaskDayStatus(task, today);
    if (status === "overdue") return 0;
    if (status === "today") return 1;
    if (status === "scheduled") return 2;
    return 3;
  };
  const priority = { high: 0, normal: 1, low: 2 } as const;

  return [...tasks].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      priority[a.priority] - priority[b.priority] ||
      (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export function formatRelativeTaskDate(task: Task, today: string) {
  const status = getTaskDayStatus(task, today);
  if (status === "completed") return "Done today";
  if (!task.dueDate) return status === "overdue" ? "Carried forward" : "Today";
  if (task.dueDate === today) return "Today";

  const difference = Math.round(
    (Date.parse(`${task.dueDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) /
      86_400_000,
  );
  if (difference === 1) return "Tomorrow";
  if (difference < 0) {
    const days = Math.abs(difference);
    return `${days} day${days === 1 ? "" : "s"} overdue`;
  }
  return `In ${difference} days`;
}

export function getTaskStats(tasks: Task[]) {
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const activeTasksCount = tasks.length - completedTasksCount;
  const totalEstimateMinutes = tasks
    .filter((task) => !task.completed)
    .reduce((total, task) => total + task.estimateMinutes, 0);
  const hardTasksCount = tasks.filter(
    (task) => !task.completed && task.complexity === "hard",
  ).length;

  return {
    activeTasksCount,
    completedTasksCount,
    completionPercent:
      tasks.length === 0 ? 0 : Math.round((completedTasksCount / tasks.length) * 100),
    hardTasksCount,
    totalEstimateMinutes,
  };
}
