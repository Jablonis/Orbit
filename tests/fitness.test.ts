import assert from "node:assert/strict";
import test from "node:test";
import {
  mapDbFitnessDay,
  qualityLabels,
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
  assert.equal(day.log.durationMinutes, 70);
  assert.equal(day.log.sport, "tennis");
});

test("fitness-facing labels use the English product language", () => {
  assert.equal(qualityLabels.high, "Strong");
  assert.match(sportDescriptions.mobility, /Mobility/);
});
