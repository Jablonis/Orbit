import assert from "node:assert/strict";
import test from "node:test";
import {
  VOYAGE_LEGS,
  daysOut,
  format,
  getVoyage,
  getVoyageLine,
} from "../src/lib/voyage";
import type { ProductivityPoint } from "../src/lib/productivity-score";

function days(scores: Array<number | null>, future = 0): ProductivityPoint[] {
  return scores.map((score, index) => {
    const date = new Date("2026-01-01T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);
    return {
      completedFitness: 0,
      completedHabits: 0,
      completedTasks: 0,
      date: date.toISOString().slice(0, 10),
      focusMinutes: 0,
      future: index >= scores.length - future,
      label: "Day",
      plannedFitness: 0,
      plannedHabits: 0,
      plannedTasks: 0,
      score,
    };
  });
}

test("the map only ever goes outward", () => {
  const distances = VOYAGE_LEGS.map((leg) => leg.distance);

  assert.equal(distances[0], 0, "a voyage starts at the pad");
  assert.deepEqual([...distances].sort((a, b) => a - b), distances);
  assert.equal(new Set(VOYAGE_LEGS.map((leg) => leg.id)).size, VOYAGE_LEGS.length);
});

test("distance is every scored day added up, and nothing takes it back", () => {
  const climbing = getVoyage(days([80, 90, 70]));
  const thenNothing = getVoyage(days([80, 90, 70, 0, 0, 0, 0, 0, 0, 0]));

  assert.equal(climbing.distance, 240);
  assert.equal(thenNothing.distance, 240, "empty days cost nothing");
  assert.ok(thenNothing.distance >= climbing.distance);
});

test("a day that has not happened is not a day of zero", () => {
  const withFuture = getVoyage(days([80, 80, null, null], 2));

  assert.equal(withFuture.distance, 160);
  assert.equal(withFuture.pace, 80, "the pace ignores days still to come");
});

test("arriving is dated by the day the distance passed the place", () => {
  const voyage = getVoyage(days([100, 100, 100, 100, 100]));

  assert.equal(voyage.arrivals.length, 1);
  assert.equal(voyage.arrivals[0].leg.id, "karman");
  assert.equal(voyage.arrivals[0].date, "2026-01-04", "the day it crossed 400");
  assert.equal(voyage.current.id, "karman");
});

test("one enormous day can pass more than one place, all on that day", () => {
  const voyage = getVoyage(days([100, 3000]));

  assert.deepEqual(
    voyage.arrivals.map((arrival) => arrival.leg.id),
    ["karman", "low-orbit", "geostationary"],
  );
  assert.ok(voyage.arrivals.every((arrival) => arrival.date === "2026-01-02"));
});

test("the countdown is to the next place, and the pace reads the last week", () => {
  // Ten days of 50: 500 travelled, past the Kármán line at 400.
  const voyage = getVoyage(days(Array.from({ length: 10 }, () => 50)));

  assert.equal(voyage.distance, 500);
  assert.equal(voyage.current.id, "karman");
  assert.equal(voyage.next?.id, "low-orbit");
  assert.equal(voyage.toNext, 700);
  assert.equal(voyage.pace, 50);
  assert.equal(voyage.etaDays, 14);
  assert.equal(getVoyageLine(voyage), "Low orbit in 14 days at this pace.");
});

test("a stalled voyage refuses to promise a date", () => {
  const voyage = getVoyage(days([90, 0, 0, 0, 0, 0, 0, 0]));

  assert.equal(voyage.pace, 0);
  assert.equal(voyage.etaDays, null);
  assert.match(getVoyageLine(voyage), /to The Kármán line\.$/);
});

test("the pad reports the first place rather than a distance travelled", () => {
  const voyage = getVoyage([]);

  assert.equal(voyage.distance, 0);
  assert.equal(voyage.current.id, "pad");
  assert.equal(voyage.arrivals.length, 0);
  assert.equal(voyage.progress, 0);
  assert.match(getVoyageLine(voyage), /^On the pad\./);
});

test("progress runs from the place behind you to the one ahead", () => {
  const half = getVoyage(days([800]));

  assert.equal(half.current.id, "karman");
  assert.equal(half.next?.id, "low-orbit");
  assert.equal(half.progress, 0.5);
});

test("past the last place the voyage says so instead of stopping", () => {
  const voyage = getVoyage(days([100000, 5000]));

  assert.equal(voyage.next, null);
  assert.equal(voyage.progress, 1);
  assert.equal(voyage.toNext, 0);
  assert.equal(voyage.current.id, "heliopause");
  assert.match(getVoyageLine(voyage), /Everything from here is new\./);
});

test("distances are spaced so they can be read at a glance", () => {
  assert.equal(format(12400), "12 400 km");
  assert.equal(format(400), "400 km");
});

test("the voyage knows the day it started, and how long a leg took", () => {
  const voyage = getVoyage(days([100, 100, 100, 100, 100]));

  assert.equal(voyage.startedOn, "2026-01-01");
  assert.equal(daysOut(voyage.startedOn, voyage.arrivals[0].date), 4);
  assert.equal(daysOut(null, "2026-01-04"), 1, "a voyage with no days is day one");
  assert.equal(daysOut("2026-01-04", "2026-01-04"), 1);
});
