import assert from "node:assert/strict";
import test from "node:test";
import {
  describeRepeat,
  getDayTasks,
  getRoutineHold,
  isRoutineDueOn,
  normaliseRepeatDays,
  orderedWeekdays,
  weekdayOf,
} from "../src/lib/routines";
import { getTaskDayStatus, getVisibleTasks, type Task, type TaskCompletion } from "../src/lib/tasks";

function task(overrides: Partial<Task> = {}): Task {
  return {
    category: "General",
    completed: false,
    complexity: "medium",
    createdAt: "2026-01-01T08:00:00Z",
    dueDate: "",
    estimateMinutes: 60,
    estimateMode: "1hr",
    id: "task-1",
    note: "",
    priority: "normal",
    repeatDays: [],
    timeFrom: "",
    timeTo: "",
    title: "Morning pages",
    type: "personal",
    ...overrides,
  };
}

function completion(overrides: Partial<TaskCompletion> = {}): TaskCompletion {
  return {
    completedAt: "2026-08-24T09:00:00Z",
    estimateMinutes: 60,
    plannedFor: "2026-08-24",
    taskId: "task-1",
    ...overrides,
  };
}

test("a weekday is read from the date, not from the reader's clock", () => {
  // 2026-08-24 is a Monday.
  assert.equal(weekdayOf("2026-08-24"), 1);
  assert.equal(weekdayOf("2026-08-23"), 0, "Sunday is 0, as the column says");
  assert.equal(weekdayOf("not-a-date"), -1);
});

test("a routine lands on its days and stays away on the others", () => {
  const weekdays = task({ repeatDays: [1, 2, 3, 4, 5] });

  assert.equal(isRoutineDueOn(weekdays, "2026-08-24"), true, "Monday");
  assert.equal(isRoutineDueOn(weekdays, "2026-08-29"), false, "Saturday");
  assert.equal(isRoutineDueOn(task(), "2026-08-24"), false, "a one-off is not a routine");
});

test("a routine does not arrive already behind", () => {
  const routine = task({ createdAt: "2026-08-25T08:00:00Z", repeatDays: [1] });

  assert.equal(isRoutineDueOn(routine, "2026-08-17"), false, "before it existed");
  assert.equal(isRoutineDueOn(routine, "2026-08-31"), true);
});

test("a routine is never overdue and never permanently done", () => {
  const routine = task({ createdAt: "2026-01-01T08:00:00Z", repeatDays: [1] });

  assert.equal(getTaskDayStatus(routine, "2026-08-24"), "today");
  assert.equal(getTaskDayStatus(routine, "2026-08-25"), "scheduled");
  assert.deepEqual(
    getVisibleTasks([routine], "2026-08-25").length,
    0,
    "a routine off its day is out of the way",
  );
});

test("a day carries its routines and its one-offs, each with its own done", () => {
  const routine = task({ id: "routine", repeatDays: [1] });
  const oneOff = task({ id: "one-off" });
  const day = getDayTasks([routine, oneOff], [completion({ taskId: "routine" })], "2026-08-24");

  assert.deepEqual(
    day.map((entry) => [entry.task.id, entry.routine, entry.done]),
    [
      ["routine", true, true],
      ["one-off", false, false],
    ],
  );
  assert.equal(
    getDayTasks([routine], [completion({ taskId: "routine" })], "2026-08-31")[0].done,
    false,
    "yesterday's tick does not carry into next Monday",
  );
});

test("a routine is held as a rate, so one bad Tuesday is not a reset", () => {
  const routine = task({ repeatDays: [1, 2] });
  const dates = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-31"];
  const hold = getRoutineHold(
    routine,
    [completion({ plannedFor: "2026-08-24" }), completion({ plannedFor: "2026-08-31" })],
    dates,
  );

  assert.deepEqual(hold, { done: 2, due: 3, percent: 67 });
});

test("repeat days are said in words", () => {
  assert.equal(describeRepeat([0, 1, 2, 3, 4, 5, 6]), "Every day");
  assert.equal(describeRepeat([1, 2, 3, 4, 5]), "Weekdays");
  assert.equal(describeRepeat([0, 6]), "Weekend");
  assert.equal(describeRepeat([1, 3, 5]), "Mon, Wed, Fri");
  assert.equal(describeRepeat([]), "");
});

test("repeat days are cleaned before they are stored or read", () => {
  assert.deepEqual(normaliseRepeatDays([5, 1, 1, 9, -2, 3.5, 0]), [0, 1, 5]);
});

test("the week is offered in the order the account reads it", () => {
  assert.equal(orderedWeekdays("monday")[0].label, "Mon");
  assert.equal(orderedWeekdays("sunday")[0].label, "Sun");
});

test("a routine is planned on every day it repeats onto, and scored there", async () => {
  const { getProductivityHistory } = await import("../src/lib/dashboard");
  const routine = task({ createdAt: "2026-08-01T08:00:00Z", id: "routine", repeatDays: [1, 3] });
  const calendar = { timeZone: "Europe/Bratislava" as const, weekStartsOn: "monday" as const };
  const week = getProductivityHistory(
    [routine],
    [completion({ plannedFor: "2026-08-24", taskId: "routine" })],
    [],
    [],
    "2026-08-26",
    7,
    calendar,
  );
  const on = (date: string) => week.find((point) => point.date === date);

  assert.equal(on("2026-08-24")?.plannedTasks, 1, "Monday is a routine day");
  assert.equal(on("2026-08-24")?.completedTasks, 1, "and it was done");
  assert.equal(on("2026-08-25")?.plannedTasks, 0, "Tuesday is not");
  assert.equal(on("2026-08-26")?.plannedTasks, 1, "Wednesday is");
  assert.equal(on("2026-08-26")?.completedTasks, 0, "and it is still open");
});

test("today's rings read a routine's day, not a flag on the task", async () => {
  const { getDailyRings } = await import("../src/lib/dashboard");
  const routine = task({ id: "routine", repeatDays: [1] });
  const training = {
    day: { log: { completed: false }, sport: "rest" },
  } as unknown as Parameters<typeof getDailyRings>[2];

  assert.equal(
    getDailyRings([routine], [], training, [], "2026-08-24", "Europe/Bratislava")
      .tasks.completed,
    0,
  );
  assert.equal(
    getDailyRings(
      [routine],
      [completion({ plannedFor: "2026-08-24", taskId: "routine" })],
      training,
      [],
      "2026-08-24",
      "Europe/Bratislava",
    ).tasks.completed,
    1,
  );
});

test("the repeat sentence keeps a weekday's capital and drops the list's", async () => {
  const { repeatSentence } = await import("../src/lib/routines");

  assert.equal(repeatSentence([0, 1, 2, 3, 4, 5, 6]), "Comes back every day");
  assert.equal(repeatSentence([1, 2, 3, 4, 5]), "Comes back on weekdays");
  assert.equal(repeatSentence([0, 6]), "Comes back at the weekend");
  assert.equal(repeatSentence([1, 3, 5]), "Comes back on Mon, Wed, Fri");
  assert.equal(repeatSentence([]), "");
});
