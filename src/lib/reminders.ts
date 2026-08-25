/**
 * The evening reminder. Everything here is pure so the decision — who gets a
 * notification, and what it says — can be tested without a browser, a push
 * service, or a clock.
 */

import { ORBIT_DAY_SCORE, type Momentum } from "@/lib/momentum";

export const REMINDER_HOURS = [17, 18, 19, 20, 21, 22] as const;

export type ReminderHour = (typeof REMINDER_HOURS)[number];

export type ReminderPreferences = {
  enabled: boolean;
  hour: ReminderHour;
};

export const defaultReminderPreferences: ReminderPreferences = {
  enabled: false,
  hour: 20,
};

export function parseReminderPreferences(value: unknown): ReminderPreferences {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const hour = Number(record.hour);

  return {
    enabled: record.enabled === true,
    hour: REMINDER_HOURS.includes(hour as ReminderHour)
      ? (hour as ReminderHour)
      : defaultReminderPreferences.hour,
  };
}

/** The hour of the day where this person lives, 0 to 23. */
export function getLocalHour(timeZone: string, now: Date) {
  const formatted = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(now);
  return Number(formatted);
}

export type DueInput = {
  alreadySentToday: boolean;
  hasSubscription: boolean;
  localHour: number;
  reminders: ReminderPreferences;
  todayScore: number | null;
};

/**
 * Four conditions, all of which must hold. The day being already in orbit is
 * the one that matters most: a reminder about a day you have finished is spam.
 */
export function isReminderDue({
  alreadySentToday,
  hasSubscription,
  localHour,
  reminders,
  todayScore,
}: DueInput) {
  if (!reminders.enabled) return false;
  if (!hasSubscription) return false;
  if (alreadySentToday) return false;
  if (localHour !== reminders.hour) return false;
  return (todayScore ?? 0) < ORBIT_DAY_SCORE;
}

export type Reminder = { body: string; title: string };

/**
 * What the notification says. One number, one consequence, no guilt — the
 * mechanic already applies the pressure.
 */
export function buildReminder({
  momentum,
  streak,
}: {
  momentum: Pick<Momentum, "holdScore" | "projected" | "tier" | "todayScore">;
  streak: number;
}): Reminder {
  const scored = momentum.todayScore ?? 0;
  const toOrbit = Math.max(0, ORBIT_DAY_SCORE - scored);
  const runLine =
    streak > 1 ? ` A ${streak}-day run is riding on it.` : "";

  if (momentum.holdScore && momentum.holdScore > scored) {
    return {
      body: `That keeps you in ${momentum.tier.name}.${runLine}`,
      title: `Finish today at ${momentum.holdScore}%`,
    };
  }

  return {
    body: `${momentum.tier.name} holds either way, but the day does not count yet.${runLine}`,
    title: `${toOrbit} points from a day in orbit`,
  };
}
