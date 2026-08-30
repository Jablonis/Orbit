import assert from "node:assert/strict";
import test from "node:test";
import {
  actionResult,
  idleActionState,
  latestFeedback,
} from "../src/lib/action-state";

test("the idle state has no timestamp, so it can never win the feedback race", () => {
  assert.equal(idleActionState.at, undefined);
  assert.equal(latestFeedback([idleActionState, idleActionState]), null);
});

test("a stamped result carries its moment", () => {
  const before = Date.now();
  const result = actionResult(true, "Saved.");
  assert.ok(result.at !== undefined && result.at >= before);
  assert.equal(result.ok, true);
});

test("whichever action spoke last is the one reported", () => {
  const saved = { at: 1000, message: "Habit added.", ok: true };
  const failedArchive = { at: 2000, message: "Habit not found.", ok: false };

  assert.deepEqual(latestFeedback([saved, failedArchive]), failedArchive);
  // The same two states in the other order answer the same: order of the
  // array is not order of events.
  assert.deepEqual(latestFeedback([failedArchive, saved]), failedArchive);
});

test("an empty message is silence, not feedback", () => {
  const silent = { at: 3000, message: "", ok: true };
  const spoke = { at: 1000, message: "Saved.", ok: true };

  assert.deepEqual(latestFeedback([silent, spoke]), spoke);
});
