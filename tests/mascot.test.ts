import assert from "node:assert/strict";
import test from "node:test";
import {
  CLIMB_FLOOR,
  PIP_KITS,
  formatMultiplier,
  getClimb,
  getPanelPip,
  getPipState,
} from "../src/lib/mascot";

test("a finished day beats everything else Pip could say", () => {
  const state = getPipState({
    allClosed: true,
    altitude: 12,
    streak: 9,
    todayScore: 30,
  });

  assert.equal(state.mood, "sealed");
  assert.equal(state.burn, 1);
  assert.match(state.line, /9 days/);
});

test("Pip reads the day before the orbit", () => {
  const moods = [
    getPipState({ allClosed: false, altitude: 90, streak: 5, todayScore: 85 }),
    getPipState({ allClosed: false, altitude: 90, streak: 5, todayScore: 60 }),
    getPipState({ allClosed: false, altitude: 90, streak: 5, todayScore: 20 }),
    getPipState({ allClosed: false, altitude: 70, streak: 5, todayScore: 0 }),
    getPipState({ allClosed: false, altitude: 10, streak: 0, todayScore: null }),
  ].map((state) => state.mood);

  assert.deepEqual(moods, [
    "soaring",
    "cruising",
    "lifting",
    "grounded",
    "asleep",
  ]);
});

test("the burn only ever grows with the day", () => {
  const burns = [null, 10, 55, 85].map(
    (todayScore) =>
      getPipState({ allClosed: false, altitude: 0, streak: 0, todayScore })
        .burn,
  );

  assert.deepEqual([...burns].sort((a, b) => a - b), burns);
});

test("the multiplier is what the day actually did to the orbit", () => {
  const climb = getClimb(50, 62);

  assert.equal(climb.multiplier, 1.24);
  assert.equal(climb.rising, true);
  assert.equal(climb.from, 50);
  assert.equal(climb.to, 62);
});

test("an empty day lands on the decay, not on something invented", () => {
  const climb = getClimb(60, 60 * CLIMB_FLOOR);

  assert.equal(climb.multiplier, 0.85);
  assert.equal(climb.rising, false);
  // The floor of the range: it sinks, and it is still drawable.
  assert.ok(climb.peak > 0 && climb.peak < 0.05);
});

test("a first day from nothing still reads as a launch", () => {
  const launched = getClimb(0, 18);
  const nothing = getClimb(0, 0);

  assert.equal(launched.multiplier, 2);
  assert.equal(launched.rising, true);
  assert.equal(nothing.multiplier, 1);
  assert.equal(nothing.rising, false);
});

test("the peak stays inside the frame however big the day was", () => {
  for (const [from, to] of [
    [10, 100],
    [1, 100],
    [50, 51],
    [80, 20],
  ]) {
    const { peak } = getClimb(from, to);
    assert.ok(peak > 0 && peak <= 1, `${from}→${to} left the frame`);
  }
});

test("the multiplier prints to two decimals, always", () => {
  assert.equal(formatMultiplier(1.2), "×1.20");
  assert.equal(formatMultiplier(0.85), "×0.85");
  assert.equal(formatMultiplier(2), "×2.00");
});

test("a panel's Pip climbs the same ladder the day does", () => {
  // Nothing asked is dozing on the pad; asked for four and given none is a
  // penguin who minds. They used to wear the same face.
  assert.equal(getPanelPip(0, 0).mood, "asleep", "nothing asked, nothing claimed");
  assert.equal(getPanelPip(0, 4).mood, "grounded");
  assert.equal(getPanelPip(1, 4).mood, "lifting");
  assert.equal(getPanelPip(2, 4).mood, "cruising");
  assert.equal(getPanelPip(4, 5).mood, "soaring");
  assert.equal(getPanelPip(4, 4).mood, "sealed");
  assert.equal(getPanelPip(9, 4).mood, "sealed", "past the ask is still done");
});

test("a panel's Pip carries the tools of the thing it stands next to", () => {
  assert.deepEqual(getPanelPip(1, 3, "tasks", PIP_KITS.tasks).kit, {
    glasses: true,
    prop: "notes",
  });
  assert.deepEqual(getPanelPip(1, 3, "training", PIP_KITS.fitness).kit, {
    glasses: false,
    prop: "dumbbell",
  });
  // A panel that names no kit gets the penguin, not a penguin holding a
  // dumbbell on a page about money.
  assert.deepEqual(getPanelPip(1, 3).kit, { glasses: false, prop: "none" });
});

test("a panel's Pip says what he is reacting to", () => {
  assert.equal(getPanelPip(2, 4, "tasks").title, "2 of 4 in tasks.");
  assert.equal(getPanelPip(0, 0, "training").title, "Nothing planned in training.");
});
