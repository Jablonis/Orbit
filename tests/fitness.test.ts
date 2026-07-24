import assert from "node:assert/strict";
import test from "node:test";
import {
  getDateForWeekday,
  getWeekDateKeys,
  mapDbFitnessDay,
  qualityLabels,
  resolveFitnessPlanHistory,
  sportDescriptions,
} from "../src/lib/fitness";

test("keeps planned and actual fitness duration separate", () => {
  const day = mapDbFitnessDay(
    {
      notes: "Planned work",
      planned_duration_minutes: 45,
      planned_time: "07:30",
      sport: "gym",
      weekday: "monday",
    },
    "2026-07-20",
    {
      completed: true,
      durationMinutes: 70,
      notes: "Actual work",
      performedOn: "2026-07-20",
      quality: "high",
      sport: "tennis",
      time: "08:00",
    },
  );

  assert.equal(day.plannedDurationMinutes, 45);
  assert.equal(day.plannedTime, "07:30");
  assert.equal(day.templateSport, "gym");
  assert.equal(day.log.durationMinutes, 70);
  assert.equal(day.log.sport, "tennis");
});

test("shows a dated plan while retaining the editable reusable template", () => {
  const day = mapDbFitnessDay(
    {
      notes: "Current template",
      planned_duration_minutes: 60,
      planned_time: "08:00",
      sport: "cardio",
      weekday: "monday",
    },
    "2026-07-20",
    undefined,
    {
      date: "2026-07-20",
      notes: "Historical plan",
      plannedDurationMinutes: 45,
      plannedTime: "07:00",
      sport: "gym",
    },
  );

  assert.equal(day.sport, "gym");
  assert.equal(day.plannedDurationMinutes, 45);
  assert.equal(day.templateSport, "cardio");
});

test("fitness-facing labels use the English product language", () => {
  assert.equal(qualityLabels.high, "Strong");
  assert.match(sportDescriptions.mobility, /Mobility/);
});

test("calendar weeks honor the saved first day", () => {
  assert.deepEqual(getWeekDateKeys("2026-07-22", "monday"), [
    "2026-07-20",
    "2026-07-21",
    "2026-07-22",
    "2026-07-23",
    "2026-07-24",
    "2026-07-25",
    "2026-07-26",
  ]);
  assert.deepEqual(getWeekDateKeys("2026-07-22", "sunday"), [
    "2026-07-19",
    "2026-07-20",
    "2026-07-21",
    "2026-07-22",
    "2026-07-23",
    "2026-07-24",
    "2026-07-25",
  ]);
  assert.equal(
    getDateForWeekday("2026-07-19", "monday", "sunday"),
    "2026-07-20",
  );
});

test("effective-dated plans keep closed weeks stable", () => {
  const plans = resolveFitnessPlanHistory(
    [
      {
        effectiveFrom: "1970-01-01",
        notes: "",
        plannedDurationMinutes: 60,
        plannedTime: "",
        sport: "gym",
        weekday: "monday",
      },
      {
        effectiveFrom: "2026-07-23",
        notes: "",
        plannedDurationMinutes: 45,
        plannedTime: "07:30",
        sport: "cardio",
        weekday: "monday",
      },
    ],
    "2026-07-20",
    "2026-07-28",
  );

  assert.equal(
    plans.find((plan) => plan.date === "2026-07-20")?.sport,
    "gym",
  );
  assert.equal(
    plans.find((plan) => plan.date === "2026-07-27")?.sport,
    "cardio",
  );
});
