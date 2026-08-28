/**
 * Habits: the third pillar of a day.
 *
 * Tasks are the work and training is the body. The third thing a day is made
 * of is whatever this account has decided to keep doing — reading, no phone
 * after ten, Slovak, a cold shower. Orbit cannot guess it, so it is named
 * here, with the days it is asked for.
 *
 * A habit is deliberately not a routine task. A routine lands on the list and
 * is scored as work; a habit is a standing commitment that is kept on a day or
 * not, and it carries its own ring. That separation is what stops "read for
 * ten minutes" competing with "file the tax return" for the same bar.
 *
 * The logic here is pure and the queries are at the bottom, in the shape the
 * rest of the codebase uses: a habit is due on a date, done on a date, and
 * held at a rate — never "on a streak", because a rate survives one bad
 * Tuesday and a streak does not.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseRepeatDays, weekdayOf } from "@/lib/routines";
import { getDateInTimeZone } from "@/lib/tasks";

export type Habit = {
  createdAt: string;
  id: string;
  name: string;
  /** Weekdays this habit is asked for, 0 = Sunday. Empty means never. */
  repeatDays: number[];
};

export type HabitCheck = {
  date: string;
  habitId: string;
};

export type DayHabit = {
  done: boolean;
  habit: Habit;
};

/**
 * A habit is asked for on a date if it repeats onto that weekday and the date
 * is not before the day it was written down. Nobody wants a new habit to
 * arrive already three weeks behind.
 */
export function isHabitDueOn(
  habit: Habit,
  date: string,
  timeZone: string = "Europe/Bratislava",
) {
  if (!habit.repeatDays.includes(weekdayOf(date))) return false;
  const created = getDateInTimeZone(habit.createdAt ?? "", timeZone);
  return !created || date >= created;
}

export function isHabitDoneOn(
  checks: HabitCheck[],
  habitId: string,
  date: string,
) {
  return checks.some(
    (check) => check.habitId === habitId && check.date === date,
  );
}

/** Everything asked of this day, in the order the habits were written down. */
export function getDayHabits(
  habits: Habit[],
  checks: HabitCheck[],
  date: string,
  timeZone: string = "Europe/Bratislava",
): DayHabit[] {
  return habits
    .filter((habit) => isHabitDueOn(habit, date, timeZone))
    .map((habit) => ({
      done: isHabitDoneOn(checks, habit.id, date),
      habit,
    }));
}

/** How much of one day's habits are kept: the ring, in the shared shape. */
export function getHabitRing(
  habits: Habit[],
  checks: HabitCheck[],
  date: string,
  timeZone: string = "Europe/Bratislava",
) {
  const due = getDayHabits(habits, checks, date, timeZone);
  const completed = due.filter((entry) => entry.done).length;
  return {
    completed,
    percent: due.length ? Math.round((completed / due.length) * 100) : 0,
    total: due.length,
  };
}

/**
 * What a habit has actually been worth lately: how many of the days it was
 * asked for it was kept on. The same measure a routine reports, so the two
 * cannot disagree about what "holding" means.
 */
export function getHabitHold(
  habit: Habit,
  checks: HabitCheck[],
  dates: string[],
  timeZone: string = "Europe/Bratislava",
) {
  const due = dates.filter((date) => isHabitDueOn(habit, date, timeZone));
  const done = due.filter((date) => isHabitDoneOn(checks, habit.id, date));
  return {
    done: done.length,
    due: due.length,
    percent: due.length ? Math.round((done.length / due.length) * 100) : 0,
  };
}

/** The one line a habit says about itself under its name. */
export function habitHoldSentence(hold: ReturnType<typeof getHabitHold>) {
  if (hold.due === 0) return "Not asked for yet";
  if (hold.done === hold.due) return `Kept every one of the last ${hold.due}`;
  return `Kept ${hold.done} of the last ${hold.due}`;
}

type PostgrestErrorish = { code?: string; message?: string } | null;

/**
 * Whether this database is simply one without the habits migration.
 *
 * The lesson from routines, applied before it can be relearned: a deploy can
 * land before its migration does, and a dashboard that reads a table the
 * database has never heard of takes every signed-in page down with it. Reads
 * are compiled to SQL and refused by Postgres (`42P01`); requests routed by
 * PostgREST are refused against its schema cache first, as `PGRST205` for a
 * table and `PGRST202` for a function. Habits are additive, so the honest
 * answer to all three is "this account has no habits yet".
 */
export function isMissingHabitsSchema(error: PostgrestErrorish) {
  const code = error?.code ?? "";
  return code === "42P01" || code === "PGRST205" || code === "PGRST202";
}

type DbHabit = {
  created_at: string;
  id: string;
  name: string;
  repeat_days: number[] | null;
};

type DbHabitCheck = {
  done_on: string;
  habit_id: string;
};

export function mapDbHabit(row: DbHabit): Habit {
  return {
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    repeatDays: normaliseRepeatDays(row.repeat_days ?? []),
  };
}

export async function getHabits(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("habits")
    .select("id,name,repeat_days,created_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingHabitsSchema(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapDbHabit(row as DbHabit));
}

export async function getHabitChecks(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string,
) {
  const { data, error } = await supabase
    .from("habit_checks")
    .select("habit_id,done_on")
    .eq("user_id", userId)
    .gte("done_on", from)
    .lte("done_on", to);

  if (error) {
    if (isMissingHabitsSchema(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const check = row as DbHabitCheck;
    return { date: check.done_on, habitId: check.habit_id } satisfies HabitCheck;
  });
}
