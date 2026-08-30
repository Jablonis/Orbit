import assert from "node:assert/strict";
import test from "node:test";
import {
  toIngestDate,
  toIngestMinutes,
  toIngestSport,
} from "../src/lib/watch-ingest";

test("Orbit's own sports come through untouched", () => {
  for (const sport of ["gym", "tennis", "cardio", "mobility"]) {
    assert.equal(toIngestSport(sport), sport);
    assert.equal(toIngestSport(sport.toUpperCase()), sport);
  }
});

test("Apple's workout names are translated, not rejected", () => {
  assert.equal(toIngestSport("Traditional Strength Training"), "gym");
  assert.equal(toIngestSport("Functional Strength Training"), "gym");
  assert.equal(toIngestSport("HIIT"), "gym");
  assert.equal(toIngestSport("Tennis"), "tennis");
  assert.equal(toIngestSport("Padel"), "tennis");
  assert.equal(toIngestSport("Yoga"), "mobility");
  assert.equal(toIngestSport("Pilates"), "mobility");
});

test("an unknown workout is still a workout", () => {
  // Losing the day over a name Orbit has not heard of would be the worst
  // possible trade: the session happened either way.
  assert.equal(toIngestSport("Kitesurfing"), "cardio");
  assert.equal(toIngestSport(""), "cardio");
});

test("a duration is minutes, or it is nothing", () => {
  assert.equal(toIngestMinutes(55), 55);
  assert.equal(toIngestMinutes("55"), 55);
  assert.equal(toIngestMinutes(55.4), 55);
  assert.equal(toIngestMinutes(0), null);
  assert.equal(toIngestMinutes(-10), null);
  // A phone that sent seconds instead of minutes is refused rather than
  // silently recording a twenty-hour session.
  assert.equal(toIngestMinutes(3300), null);
  assert.equal(toIngestMinutes("about an hour"), null);
  assert.equal(toIngestMinutes(undefined), null);
});

test("a date is an ISO day or it is nothing — never a guess", () => {
  assert.equal(toIngestDate("2026-08-28"), "2026-08-28");
  assert.equal(toIngestDate("28/08/2026"), null);
  assert.equal(toIngestDate("today"), null);
  assert.equal(toIngestDate(undefined), null);
});
