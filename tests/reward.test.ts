import assert from "node:assert/strict";
import test from "node:test";
import { formatReward, getRemainingReward, getTaskReward } from "../src/lib/reward";
import type { ProductivityPoint } from "../src/lib/productivity-score";
import type { Task } from "../src/lib/tasks";

const domains = ["tasks", "fitness", "focus"] as const;

function point(overrides: Partial<ProductivityPoint> = {}): ProductivityPoint {
  return {
    completedFitness: 0,
    completedHabits: 0,
    completedTasks: 0,
    date: "2026-08-24",
    focusMinutes: 0,
    future: false,
    label: "Mon",
    plannedFitness: 1,
    plannedHabits: 0,
    plannedTasks: 4,
    score: 0,
    ...overrides,
  };
}

function task(estimateMinutes = 60): Task {
  return {
    category: "General",
    completed: false,
    complexity: "medium",
    dueDate: "",
    estimateMinutes,
    estimateMode: "1hr",
    id: "task-1",
    note: "",
    priority: "normal",
    repeatDays: [],
    timeFrom: "",
    timeTo: "",
    title: "Ship the thing",
    type: "deep-work",
  };
}

test("a task is worth the kilometres the day actually gains", () => {
  const today = point();

  // One of four tasks is a quarter of the 60-point task weight, and an hour is
  // half of the two-hour focus target's 15.
  assert.equal(getTaskReward(today, task(60), [...domains]), 15 + 8);
});

test("the fewer are left, the more each one is worth", () => {
  const few = point({ plannedTasks: 2 });
  const many = point({ plannedTasks: 8 });

  assert.ok(getTaskReward(few, task(), [...domains]) > getTaskReward(many, task(), [...domains]));
});

test("a day already at the top has nothing left to give", () => {
  const done = point({
    completedFitness: 1,
    completedHabits: 0,
    completedTasks: 4,
    focusMinutes: 240,
  });

  assert.equal(getTaskReward(done, task(), [...domains]), 0);
  assert.equal(getRemainingReward(done, [...domains]), 0);
});

test("a reward is only ever written as a gain", () => {
  assert.equal(formatReward(14.4), "+14 km");
  assert.equal(formatReward(0), "");
});
