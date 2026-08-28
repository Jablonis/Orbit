import assert from "node:assert/strict";
import test from "node:test";
import { RECAP_FRESH_DAYS, getRecapWeek, getWeekRecap } from "../src/lib/recap";
import type { ProductivityPoint } from "../src/lib/productivity-score";

function shift(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** `scores` ends on `lastDate`; one point per day, oldest first. */
function points(lastDate: string, scores: Array<number | null>) {
  return scores.map<ProductivityPoint>((score, index) => {
    const date = shift(lastDate, index - scores.length + 1);
    return {
      completedFitness: score !== null && score >= 50 ? 1 : 0,
      completedHabits: 0,
      completedTasks: score === null ? 0 : Math.round(score / 20),
      date,
      focusMinutes: score === null ? 0 : score,
      future: false,
      label: new Intl.DateTimeFormat("en", {
        timeZone: "UTC",
        weekday: "short",
      }).format(new Date(`${date}T12:00:00Z`)),
      plannedFitness: 1,
      plannedHabits: 0,
      plannedTasks: 5,
      score,
    };
  });
}

const flat = (value: number) => Array.from({ length: 28 }, () => value);

test("the recap week is the last week that is actually over", () => {
  // 2026-08-25 is a Tuesday, so the finished week is Mon 17 to Sun 23.
  const week = getRecapWeek("2026-08-25", "monday");

  assert.equal(week.weekStart, "2026-08-17");
  assert.equal(week.weekEnd, "2026-08-23");
  assert.equal(week.fresh, true);
});

test("a week stops being fresh once the new one is under way", () => {
  const monday = getRecapWeek("2026-08-24", "monday");
  const stale = getRecapWeek(shift("2026-08-24", RECAP_FRESH_DAYS), "monday");

  assert.equal(monday.fresh, true);
  assert.equal(monday.weekStart, "2026-08-17");
  assert.equal(stale.fresh, false);
  // Still the same finished week, just no longer the moment.
  assert.equal(stale.weekStart, "2026-08-17");
});

test("a Sunday-start week ends on the Saturday", () => {
  const week = getRecapWeek("2026-08-25", "sunday");

  assert.equal(week.weekStart, "2026-08-16");
  assert.equal(week.weekEnd, "2026-08-22");
});

test("the recap counts the days that held orbit, not the average alone", () => {
  const recap = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", [
      ...flat(0).slice(0, 21),
      80,
      80,
      20,
      80,
      80,
      80,
      10,
    ]),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.ok(recap);
  assert.equal(recap.daysInOrbit, 5);
  assert.equal(recap.days.length, 7);
  assert.equal(recap.bestDay?.score, 80);
  assert.equal(recap.headline, "5 days in orbit.");
});

test("a full week is named as one", () => {
  const recap = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", flat(90)),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.equal(recap?.headline, "A perfect week.");
  assert.equal(recap?.daysInOrbit, 7);
});

test("the verdict compares against the week before", () => {
  const climbed = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", [...flat(40).slice(0, 21), ...flat(90).slice(0, 7)]),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });
  const dropped = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", [...flat(90).slice(0, 21), ...flat(40).slice(0, 7)]),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.equal(climbed?.verdict, "Up 50 points on last week.");
  assert.equal(dropped?.verdict, "Down 50 points on last week.");
  assert.ok(climbed && climbed.scoreDelta > 0);
});

test("a level week says so rather than inventing a difference", () => {
  const recap = getWeekRecap({
    fresh: false,
    points: points("2026-08-23", flat(70)),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.equal(recap?.verdict, "Level with last week.");
  assert.equal(recap?.scoreDelta, 0);
});

test("the first week on the board is not compared to an empty one", () => {
  const recap = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", [...flat(0).slice(0, 21), ...flat(70).slice(0, 7)]),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.equal(recap?.verdict, "Your first week on the board.");
});

test("the best week in the window is marked, and only one of them", () => {
  const best = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", [...flat(50).slice(0, 21), ...flat(95).slice(0, 7)]),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });
  const matched = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", flat(80)),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.equal(best?.isBestWeek, true);
  // An earlier week that equalled it keeps the record; ties do not steal it.
  assert.equal(matched?.isBestWeek, false);
});

test("an empty week is never the best week", () => {
  const recap = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", flat(0)),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.equal(recap?.isBestWeek, false);
  assert.equal(recap?.headline, "A week off the board.");
  assert.equal(recap?.verdict, "Nothing logged either week. One day starts it.");
});

test("altitude is read at both ends of the week", () => {
  const recap = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", [...flat(0).slice(0, 21), ...flat(100).slice(0, 7)]),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.ok(recap);
  assert.equal(recap.altitudeStart, 0);
  assert.ok(recap.altitudeEnd > 40);
  assert.equal(recap.altitudeChange, recap.altitudeEnd - recap.altitudeStart);
  assert.equal(recap.tier.id, "mid-orbit");
});

test("a week without seven loaded days yields no recap", () => {
  const recap = getWeekRecap({
    fresh: true,
    points: points("2026-08-23", flat(70).slice(0, 4)),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.equal(recap, null);
});

test("totals add up the week, and the label names it", () => {
  const recap = getWeekRecap({
    fresh: true,
    locale: "en-GB",
    points: points("2026-08-23", flat(60)),
    weekEnd: "2026-08-23",
    weekStart: "2026-08-17",
  });

  assert.ok(recap);
  assert.equal(recap.tasks, 7 * 3);
  assert.equal(recap.sessions, 7);
  assert.equal(recap.focusMinutes, 7 * 60);
  assert.equal(recap.label, "17–23 Aug");
  assert.deepEqual(
    recap.stats.map((stat) => stat.label),
    ["In orbit", "Tasks", "Altitude"],
  );
});
