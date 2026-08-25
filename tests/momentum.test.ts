import assert from "node:assert/strict";
import test from "node:test";
import {
  MOMENTUM_DECAY,
  ORBIT_DAY_SCORE,
  getAltitudeSeries,
  getDayCard,
  getGhostRace,
  getMomentum,
  getMomentumRecords,
  getNextOrbitTier,
  getOrbitTier,
  getScoreForAltitude,
  getStreak,
  orbitTiers,
} from "../src/lib/momentum";

function day(index: number) {
  const date = new Date(Date.UTC(2026, 6, 1));
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
}

function series(scores: Array<number | null>) {
  return scores.map((score, index) => ({ date: day(index), score }));
}

test("altitude converges towards a sustained daily score", () => {
  const points = series(Array.from({ length: 60 }, () => 80));
  const result = getAltitudeSeries(points);

  assert.equal(result.at(-1)?.altitude, 80);
  assert.ok(result[0].altitude < result[5].altitude);
});

test("altitude decays instead of resetting when days are missed", () => {
  const climbed = getAltitudeSeries(series(Array.from({ length: 40 }, () => 90)));
  const decayed = getAltitudeSeries(
    series([...Array.from({ length: 40 }, () => 90), 0, 0, 0]),
  );

  assert.equal(climbed.at(-1)?.altitude, 90);
  assert.equal(
    decayed.at(-1)?.altitude,
    Math.round(90 * MOMENTUM_DECAY ** 3),
  );
  assert.ok((decayed.at(-1)?.altitude ?? 0) > 0);
});

test("tiers are ordered and resolved by altitude", () => {
  assert.deepEqual(
    orbitTiers.map((tier) => tier.floor),
    [...orbitTiers.map((tier) => tier.floor)].sort((a, b) => a - b),
  );
  assert.equal(getOrbitTier(0).id, "grounded");
  assert.equal(getOrbitTier(65).id, "mid-orbit");
  assert.equal(getOrbitTier(100).id, "escape-velocity");
  assert.equal(getNextOrbitTier(getOrbitTier(100)), null);
  assert.equal(getNextOrbitTier(getOrbitTier(0))?.id, "liftoff");
});

test("hold score is the exact score that keeps the tier floor", () => {
  const altitude = 62;
  const required = getScoreForAltitude(altitude, 60);

  assert.ok(required !== null);
  const next = MOMENTUM_DECAY * altitude + (1 - MOMENTUM_DECAY) * required;
  assert.ok(next >= 60);
  assert.equal(getScoreForAltitude(90, 60), 0);
  assert.equal(getScoreForAltitude(10, 92), null);
});

test("momentum separates the settled altitude from today's projection", () => {
  const points = series([...Array.from({ length: 40 }, () => 70), 0]);
  const momentum = getMomentum(points, day(40));

  assert.equal(momentum.daysMeasured, 40);
  assert.equal(momentum.altitude, 70);
  assert.equal(momentum.todayScore, 0);
  assert.equal(momentum.status, "decaying");
  assert.ok(momentum.projected < momentum.altitude);
  assert.equal(momentum.tier.id, "mid-orbit");
  assert.equal(momentum.nextTier?.id, "geostationary");
});

test("momentum reports the weekly altitude change", () => {
  const points = series([
    ...Array.from({ length: 20 }, () => 20),
    ...Array.from({ length: 7 }, () => 95),
    50,
  ]);
  const momentum = getMomentum(points, day(27));

  assert.ok(momentum.weekChange > 0);
});

test("a streak survives one aerobrake but not two inside the window", () => {
  const graced = getStreak(series([90, 90, 90, 0, 90, 90, 40]), day(6));
  assert.equal(graced.streak, 5);
  assert.deepEqual(graced.gracedDates, [day(3)]);
  assert.equal(graced.atRisk, true);
  assert.equal(graced.scoreToSecureToday, ORBIT_DAY_SCORE - 40);

  const broken = getStreak(series([90, 0, 90, 0, 90, 90, 90]), day(6));
  assert.equal(broken.streak, 4);
});

test("a second aerobrake is allowed once the window has passed", () => {
  const scores = [90, 90, 0, 90, 90, 90, 90, 90, 90, 0, 90, 90, 90];
  const state = getStreak(series(scores), day(12));

  assert.equal(state.streak, 11);
  assert.deepEqual(state.gracedDates, [day(9), day(2)]);
});

test("today never breaks a streak and secures it once scored", () => {
  const open = getStreak(series([80, 80, null]), day(2));
  assert.equal(open.streak, 2);
  assert.equal(open.secureToday, false);
  assert.equal(open.atRisk, true);

  const secured = getStreak(series([80, 80, 80]), day(2));
  assert.equal(secured.streak, 3);
  assert.equal(secured.secureToday, true);
  assert.equal(secured.atRisk, false);
  assert.equal(secured.scoreToSecureToday, 0);
});

test("the ghost race only compares days both weeks have reached", () => {
  const current = series([80, 80, 60]);
  const previous = series([40, 40, 40, 100, 100, 100, 100]);
  const race = getGhostRace(current, previous, day(2));

  assert.equal(race.daysCompared, 3);
  assert.equal(race.current, 220);
  assert.equal(race.previous, 120);
  assert.equal(race.delta, 100);
  assert.equal(race.status, "ahead");
  assert.match(race.verdict, /ahead/);
});

test("the ghost race calls a tie and an empty week", () => {
  assert.equal(getGhostRace(series([50]), series([50]), day(0)).status, "level");
  assert.equal(
    getGhostRace(series([50]), series([50]), day(-1)).daysCompared,
    0,
  );
});

test("records report the best day and best altitude in the window", () => {
  const records = getMomentumRecords(series([10, 95, 40, 60, 60]), day(4));

  assert.equal(records.bestDay, 95);
  assert.equal(records.bestDayDate, day(1));
  assert.equal(records.windowDays, 5);
  assert.equal(records.orbitDays, 3);
  assert.ok(records.bestAltitude > 0);
  assert.ok(records.bestAltitudeDate !== null);
});

test("the day card summarizes the projected altitude", () => {
  const points = series([...Array.from({ length: 10 }, () => 60), 100]);
  const today = day(10);
  const momentum = getMomentum(points, today);
  const card = getDayCard({
    date: today,
    ghost: getGhostRace(points.slice(-7), points.slice(0, 7), today),
    momentum,
    streak: getStreak(points, today),
  });

  assert.equal(card.altitude, momentum.projected);
  assert.equal(card.metrics.length, 3);
  assert.match(card.headline, /Climbing/);
});
