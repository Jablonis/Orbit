/**
 * Routines.
 *
 * Most of a day is the same every week: the morning, the commute, the two
 * things that always need doing on a Monday. Typing those in every morning is
 * work about work, and it is why a planner gets abandoned in week two.
 *
 * A routine is not a new kind of thing here. It is a task that carries the
 * weekdays it repeats on, and `task_completions.planned_for` already lets one
 * task be completed on many dates — which is exactly what a repeating task
 * needs and what the scoring engine already reads. So a routine never flips
 * `completed`; it is done for a date, or it is not.
 */

import type { CalendarPreferences } from "@/lib/preferences";
import type { Task, TaskCompletion } from "@/lib/tasks";
import { getDateInTimeZone, isRepeating } from "@/lib/tasks";

export type Weekday = {
  /** 0 is Sunday, matching getUTCDay and the column's check constraint. */
  index: number;
  /** Two letters: enough to recognise, short enough for seven chips. */
  initial: string;
  label: string;
  long: string;
};

export const WEEKDAYS: Weekday[] = [
  { index: 0, initial: "Su", label: "Sun", long: "Sunday" },
  { index: 1, initial: "Mo", label: "Mon", long: "Monday" },
  { index: 2, initial: "Tu", label: "Tue", long: "Tuesday" },
  { index: 3, initial: "We", label: "Wed", long: "Wednesday" },
  { index: 4, initial: "Th", label: "Thu", long: "Thursday" },
  { index: 5, initial: "Fr", label: "Fri", long: "Friday" },
  { index: 6, initial: "Sa", label: "Sat", long: "Saturday" },
];

export const WEEKDAY_PRESETS = [
  { days: [1, 2, 3, 4, 5, 6, 0], id: "daily", label: "Every day" },
  { days: [1, 2, 3, 4, 5], id: "weekdays", label: "Weekdays" },
  { days: [0, 6], id: "weekend", label: "Weekend" },
];

/** The week in the order this account reads it. */
export function orderedWeekdays(
  weekStartsOn: CalendarPreferences["weekStartsOn"] = "monday",
) {
  return weekStartsOn === "sunday"
    ? WEEKDAYS
    : [...WEEKDAYS.slice(1), WEEKDAYS[0]];
}

/** The weekday of an ISO date, read at noon so no zone can shift the day. */
export function weekdayOf(date: string) {
  const value = Date.parse(`${date}T12:00:00Z`);
  return Number.isNaN(value) ? -1 : new Date(value).getUTCDay();
}

/** The same question the task model asks, under the word used here. */
export const isRoutine = isRepeating;

/** Only the days that exist, once each, in reading order. */
export function normaliseRepeatDays(days: number[]) {
  return [...new Set(days)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

/**
 * A routine is due on a date if it repeats on that weekday and the date is not
 * before the day the routine was written down. Nobody wants a new habit to
 * arrive already three weeks behind.
 */
export function isRoutineDueOn(
  task: Task,
  date: string,
  timeZone: string = "Europe/Bratislava",
) {
  if (!isRoutine(task)) return false;
  if (!task.repeatDays.includes(weekdayOf(date))) return false;
  const created = getDateInTimeZone(task.createdAt ?? "", timeZone);
  return !created || date >= created;
}

/** Whether this routine has already been ticked for that day. */
export function isRoutineDoneOn(
  completions: TaskCompletion[],
  taskId: string,
  date: string,
) {
  return completions.some(
    (completion) =>
      completion.taskId === taskId && completion.plannedFor === date,
  );
}

/** "Every day", "Weekdays", "Mon, Wed, Fri" — never "1,3,5". */
export function describeRepeat(repeatDays: number[]) {
  const days = normaliseRepeatDays(repeatDays);
  if (days.length === 0) return "";
  const preset = WEEKDAY_PRESETS.find(
    (option) =>
      option.days.length === days.length &&
      normaliseRepeatDays(option.days).every((day, index) => day === days[index]),
  );
  if (preset) return preset.label;
  return days
    .map((day) => WEEKDAYS[day].label)
    .sort(
      (a, b) =>
        orderedWeekdays().findIndex((weekday) => weekday.label === a) -
        orderedWeekdays().findIndex((weekday) => weekday.label === b),
    )
    .join(", ");
}

/**
 * The sentence under the day chips. "Every day" is said as English; a handful
 * of days keeps its capitals, because Mon is a name and mon is a typo.
 */
export function repeatSentence(repeatDays: number[]) {
  const days = normaliseRepeatDays(repeatDays);
  if (days.length === 0) return "";
  if (days.length === 7) return "Comes back every day";
  const described = describeRepeat(days);
  return described === "Weekdays"
    ? "Comes back on weekdays"
    : described === "Weekend"
      ? "Comes back at the weekend"
      : `Comes back on ${described}`;
}

export type DayTask = {
  /** Done for this date — for a routine that is per date, not for good. */
  done: boolean;
  routine: boolean;
  task: Task;
};

/**
 * Everything that belongs to one day: the one-off tasks that are open or were
 * finished on it, and every routine that repeats onto it.
 */
export function getDayTasks(
  tasks: Task[],
  completions: TaskCompletion[],
  date: string,
  timeZone: string = "Europe/Bratislava",
): DayTask[] {
  const routines: DayTask[] = tasks
    .filter((task) => isRoutineDueOn(task, date, timeZone))
    .map((task) => ({
      done: isRoutineDoneOn(completions, task.id, date),
      routine: true,
      task,
    }));
  const oneOffs: DayTask[] = tasks
    .filter((task) => !isRoutine(task))
    .map((task) => ({ done: task.completed, routine: false, task }));

  return [...routines, ...oneOffs];
}

/**
 * What a routine has been worth lately: how many of the last however many due
 * days it was actually done on. A habit is a rate, not a streak, and a rate
 * survives one bad Tuesday.
 */
export function getRoutineHold(
  task: Task,
  completions: TaskCompletion[],
  dates: string[],
  timeZone: string = "Europe/Bratislava",
) {
  const due = dates.filter((date) => isRoutineDueOn(task, date, timeZone));
  const done = due.filter((date) => isRoutineDoneOn(completions, task.id, date));
  return {
    done: done.length,
    due: due.length,
    percent: due.length ? Math.round((done.length / due.length) * 100) : 0,
  };
}
