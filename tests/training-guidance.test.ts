import assert from "node:assert/strict";
import test from "node:test";
import { getTrainingGuidance } from "../src/lib/training-guidance";
import type { SportType } from "../src/lib/fitness";

const sports: SportType[] = ["tennis", "cardio", "mobility", "rest", "gym"];

test("every sport says what the session is and how to start it", () => {
  for (const sport of sports) {
    const guidance = getTrainingGuidance(sport, "Upper body");

    for (const [part, line] of Object.entries(guidance)) {
      assert.ok(line.length > 8, `${sport} has an empty ${part}`);
    }
  }
});

test("a session Orbit has no opinion about still gets the gym answer", () => {
  const guidance = getTrainingGuidance("gym" as SportType, "Push day");

  assert.match(guidance.headline, /Push day/);
  assert.match(guidance.main, /Main lift/);
});

test("a rest day is told to rest, not to train quietly", () => {
  const guidance = getTrainingGuidance("rest", "Rest");

  assert.match(guidance.headline, /Recovery/);
  assert.match(guidance.main, /Sleep/);
});
