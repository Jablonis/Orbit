import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReminder,
  defaultReminderPreferences,
  getLocalHour,
  isReminderDue,
  parseReminderPreferences,
} from "../src/lib/reminders";
import { getOrbitTier } from "../src/lib/momentum";

const reminders = { enabled: true, hour: 20 } as const;

test("the local hour follows the person, not the server", () => {
  const noonUtc = new Date("2026-08-25T12:00:00Z");

  assert.equal(getLocalHour("UTC", noonUtc), 12);
  assert.equal(getLocalHour("Europe/Bratislava", noonUtc), 14);
  assert.equal(getLocalHour("America/Los_Angeles", noonUtc), 5);
});

test("a reminder is due only when every condition holds", () => {
  const base = {
    alreadySentToday: false,
    hasSubscription: true,
    localHour: 20,
    reminders,
    todayScore: 20,
  };

  assert.equal(isReminderDue(base), true);
  assert.equal(isReminderDue({ ...base, localHour: 19 }), false);
  assert.equal(isReminderDue({ ...base, alreadySentToday: true }), false);
  assert.equal(isReminderDue({ ...base, hasSubscription: false }), false);
  assert.equal(
    isReminderDue({ ...base, reminders: { ...reminders, enabled: false } }),
    false,
  );
});

test("a day already in orbit is never interrupted", () => {
  const base = {
    alreadySentToday: false,
    hasSubscription: true,
    localHour: 20,
    reminders,
    todayScore: 50,
  };

  assert.equal(isReminderDue(base), false);
  assert.equal(isReminderDue({ ...base, todayScore: 92 }), false);
  assert.equal(isReminderDue({ ...base, todayScore: 49 }), true);
  assert.equal(isReminderDue({ ...base, todayScore: null }), true);
});

test("the reminder carries the hold score when there is one to hold", () => {
  const reminder = buildReminder({
    momentum: {
      holdScore: 49,
      projected: 58,
      tier: getOrbitTier(62),
      todayScore: 12,
    },
    streak: 14,
  });

  assert.equal(reminder.title, "Finish today at 49%");
  assert.match(reminder.body, /Mid orbit/);
  assert.match(reminder.body, /14-day run/);
});

test("a safe tier still says what the day is short of", () => {
  const reminder = buildReminder({
    momentum: {
      holdScore: 0,
      projected: 88,
      tier: getOrbitTier(88),
      todayScore: 18,
    },
    streak: 1,
  });

  assert.equal(reminder.title, "32 points from a day in orbit");
  assert.doesNotMatch(reminder.body, /run is riding/);
});

test("reminder preferences reject anything unexpected", () => {
  assert.deepEqual(parseReminderPreferences(undefined), defaultReminderPreferences);
  assert.deepEqual(parseReminderPreferences({ enabled: "yes", hour: 3 }), {
    enabled: false,
    hour: 20,
  });
  assert.deepEqual(parseReminderPreferences({ enabled: true, hour: 18 }), {
    enabled: true,
    hour: 18,
  });
});
