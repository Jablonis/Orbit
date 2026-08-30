import assert from "node:assert/strict";
import test from "node:test";
import {
  EXERCISES,
  expandEquipment,
  getExercise,
  getExerciseName,
  isAvoided,
  MUSCLE_GROUPS,
  parseAvoidList,
} from "../src/lib/exercises";
import {
  buildBlock,
  buildFitnessPlanPayload,
  chooseGymDayCount,
  chooseGymWeekdays,
  formatLastPerformance,
  type ExerciseSet,
  getBlockWeek,
  getLastPerformance,
  getMuscleCoverage,
  getProgressionTarget,
  isBlockFinished,
  meetsFrequencyRule,
} from "../src/lib/training-block";
import type { FitnessProfile } from "../src/lib/fitness-setup";
import { type WeekdayId, weekdayOrder } from "../src/lib/fitness";

const profile = (over: Partial<FitnessProfile> = {}): FitnessProfile => ({
  availableDays: ["monday", "tuesday", "thursday", "friday"],
  equipment: ["full_gym"],
  exercisesToAvoid: "",
  experience: "intermediate",
  goal: "muscle_gain",
  sessionLengthMinutes: 75,
  templateId: "muscle_starter",
  ...over,
});

test("the library is internally consistent", () => {
  const ids = EXERCISES.map((exercise) => exercise.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate exercise id");
  for (const exercise of EXERCISES) {
    assert.match(exercise.id, /^[a-z0-9-]{1,60}$/);
    assert.ok(exercise.equipment.length > 0, `${exercise.id} needs equipment`);
    assert.ok(
      !exercise.secondaryMuscles.includes(exercise.primaryMuscle),
      `${exercise.id} lists its primary muscle twice`,
    );
  }
  for (const muscle of MUSCLE_GROUPS) {
    const bodyweight = EXERCISES.filter(
      (exercise) =>
        exercise.primaryMuscle === muscle &&
        exercise.equipment.includes("bodyweight"),
    );
    assert.ok(bodyweight.length > 0, `nothing bodyweight for ${muscle}`);
  }
});

test("an unknown exercise id reads as itself instead of crashing", () => {
  assert.equal(getExercise("retired-lift"), null);
  assert.equal(getExerciseName("retired-lift"), "retired-lift");
  assert.equal(getExerciseName("back-squat"), "Back squat");
});

test("a full gym contains dumbbells, bands and a floor", () => {
  assert.deepEqual(
    [...expandEquipment(["full_gym"])].sort(),
    ["bands", "bodyweight", "dumbbells", "full_gym"],
  );
  assert.deepEqual([...expandEquipment(["bands"])].sort(), [
    "bands",
    "bodyweight",
  ]);
});

test("the avoid list understands how it is actually typed", () => {
  assert.deepEqual(parseAvoidList("Drep, mŕtvy ťah; ZHYBY"), [
    "drep",
    "mrtvy tah",
    "zhyby",
  ]);
  // Two-letter noise never matches half the library.
  assert.deepEqual(parseAvoidList("a, no, ok"), []);

  const terms = parseAvoidList("drep, bench press");
  const squat = EXERCISES.find((item) => item.id === "back-squat")!;
  const bench = EXERCISES.find((item) => item.id === "barbell-bench-press")!;
  const row = EXERCISES.find((item) => item.id === "barbell-row")!;
  assert.equal(isAvoided(squat, terms), true);
  assert.equal(isAvoided(bench, terms), true);
  assert.equal(isAvoided(row, terms), false);
});

test("an avoided exercise never appears, and the rule still holds", () => {
  const block = buildBlock(
    profile({ exercisesToAvoid: "drep, mŕtvy ťah, bench press" }),
    1,
  );
  assert.ok(block);
  const chosen = block.sessions.flatMap((session) =>
    session.prescriptions.map((prescription) => prescription.exerciseId),
  );
  assert.ok(!chosen.includes("back-squat"));
  assert.ok(!chosen.includes("front-squat"));
  assert.ok(!chosen.includes("deadlift"));
  assert.ok(!chosen.includes("barbell-bench-press"));
  assert.equal(meetsFrequencyRule(block.coverage).ok, true);
  assert.deepEqual(block.unfilled, []);
});

test("equipment filters the choice, and every pick says why", () => {
  const block = buildBlock(profile({ equipment: ["bodyweight"] }), 1);
  assert.ok(block);
  for (const session of block.sessions) {
    for (const prescription of session.prescriptions) {
      const exercise = getExercise(prescription.exerciseId)!;
      assert.ok(
        exercise.equipment.includes("bodyweight"),
        `${exercise.id} needs a gym`,
      );
      assert.ok(prescription.reason.length > 0);
    }
  }
});

test("building the same block twice gives the same programme", () => {
  const input = profile();
  assert.equal(
    JSON.stringify(buildBlock(input, 2)),
    JSON.stringify(buildBlock(input, 2)),
  );
});

test("the next block is not the last one", () => {
  const input = profile();
  const first = buildBlock(input, 1)!;
  const second = buildBlock(input, 2)!;
  assert.notEqual(first.splitId, second.splitId);
  assert.notEqual(
    JSON.stringify(first.sessions),
    JSON.stringify(second.sessions),
  );

  // Same split shape six blocks later, but not the same exercises.
  const third = buildBlock(input, 3)!;
  assert.equal(third.splitId, first.splitId);
  const firstIds = first.sessions[0].prescriptions.map((p) => p.exerciseId);
  const thirdIds = third.sessions[0].prescriptions.map((p) => p.exerciseId);
  assert.notDeepEqual(firstIds, thirdIds);
});

test("one training day a week is refused rather than fudged", () => {
  assert.equal(chooseGymDayCount(profile({ availableDays: ["monday"] })), 0);
  assert.equal(buildBlock(profile({ availableDays: ["monday"] }), 1), null);
});

test("two days only work when they are long enough", () => {
  const twoDays = { availableDays: ["monday", "thursday"] as WeekdayId[] };
  assert.equal(
    chooseGymDayCount(profile({ ...twoDays, sessionLengthMinutes: 45 })),
    0,
  );
  assert.equal(
    chooseGymDayCount(profile({ ...twoDays, sessionLengthMinutes: 60 })),
    2,
  );
});

test("day count follows experience and goal", () => {
  const five: WeekdayId[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ];
  assert.equal(
    chooseGymDayCount(profile({ availableDays: [...five], experience: "beginner" })),
    4,
  );
  assert.equal(
    chooseGymDayCount(
      profile({ availableDays: [...five], experience: "advanced" }),
    ),
    5,
  );
  assert.equal(
    chooseGymDayCount(
      profile({
        availableDays: [...five, "saturday"],
        experience: "advanced",
      }),
    ),
    6,
  );
  assert.equal(
    chooseGymDayCount(
      profile({ availableDays: [...five], goal: "conditioning" }),
    ),
    3,
  );
});

test("sessions are spread across the days that are free", () => {
  assert.deepEqual(
    chooseGymWeekdays(["monday", "tuesday", "saturday"], 2),
    ["monday", "saturday"],
  );
  assert.deepEqual(
    chooseGymWeekdays(["monday", "tuesday", "wednesday"], 2),
    ["monday", "wednesday"],
  );
  assert.deepEqual(
    chooseGymWeekdays(["monday", "wednesday", "friday"], 3),
    ["monday", "wednesday", "friday"],
  );
  assert.deepEqual(chooseGymWeekdays(["monday"], 3), ["monday"]);
  assert.deepEqual(chooseGymWeekdays([], 2), []);
});

test("a short session loses accessories, never a muscle group", () => {
  const long = buildBlock(profile({ sessionLengthMinutes: 90 }), 1)!;
  const short = buildBlock(profile({ sessionLengthMinutes: 45 }), 1)!;
  const count = (block: typeof long) =>
    block.sessions.reduce(
      (total, session) => total + session.prescriptions.length,
      0,
    );
  assert.ok(count(short) < count(long));
  assert.equal(meetsFrequencyRule(short.coverage).ok, true);
  assert.equal(meetsFrequencyRule(getMuscleCoverage(short.sessions)).ok, true);
  short.sessions.forEach((session) => {
    session.prescriptions.forEach((prescription, index) => {
      assert.equal(prescription.position, index);
    });
  });
});

test("rep ranges follow the goal, not the calendar", () => {
  const strength = buildBlock(profile({ goal: "strength" }), 2)!;
  assert.equal(strength.phase, "strength");
  const compound = strength.sessions[0].prescriptions[0];
  assert.equal(compound.repLow, 5);
  assert.equal(compound.repHigh, 8);

  const growth = buildBlock(profile({ goal: "muscle_gain" }), 1)!;
  assert.equal(growth.phase, "hypertrophy");
  assert.equal(growth.sessions[0].prescriptions[0].repHigh, 12);

  const general = buildBlock(profile({ goal: "general_fitness" }), 1)!;
  assert.equal(general.phase, "strength");
  assert.equal(buildBlock(profile({ goal: "general_fitness" }), 2)!.phase, "hypertrophy");
});

test("the block runs six weeks and then says so", () => {
  const block = { startedOn: "2026-08-03", weeks: 6 };
  assert.equal(getBlockWeek(block.startedOn, "2026-08-03"), 1);
  assert.equal(getBlockWeek(block.startedOn, "2026-08-09"), 1);
  assert.equal(getBlockWeek(block.startedOn, "2026-08-10"), 2);
  assert.equal(getBlockWeek(block.startedOn, "2026-09-13"), 6);
  assert.equal(isBlockFinished(block, "2026-09-13"), false);
  assert.equal(isBlockFinished(block, "2026-09-14"), true);
  assert.equal(getBlockWeek(block.startedOn, "2026-09-14"), 7);
  // A date before the start never reads as week zero.
  assert.equal(getBlockWeek(block.startedOn, "2026-08-01"), 1);
});

const sets = (
  performedOn: string,
  exerciseId: string,
  rows: Array<[number, number]>,
): ExerciseSet[] =>
  rows.map(([reps, weightKg], index) => ({
    exerciseId,
    performedOn,
    reps,
    setIndex: index + 1,
    weightKg,
  }));

test("last time means the last day, with every set from it", () => {
  const history = [
    ...sets("2026-08-10", "back-squat", [
      [8, 60],
      [8, 60],
      [7, 60],
    ]),
    ...sets("2026-08-17", "back-squat", [
      [8, 62.5],
      [8, 62.5],
    ]),
    ...sets("2026-08-17", "lat-pulldown", [[10, 50]]),
  ];

  const last = getLastPerformance(history, "back-squat", "2026-08-24")!;
  assert.equal(last.date, "2026-08-17");
  assert.equal(last.sets.length, 2);
  assert.equal(last.topWeightKg, 62.5);

  // Today's own rows never count as last time.
  const earlier = getLastPerformance(history, "back-squat", "2026-08-17")!;
  assert.equal(earlier.date, "2026-08-10");
  assert.equal(earlier.sets.length, 3);

  assert.equal(getLastPerformance(history, "deadlift", "2026-08-24"), null);
});

const prescription = { repHigh: 8, repLow: 5, targetSets: 3 };

test("the progression suggestion has one branch per situation", () => {
  const first = getProgressionTarget(null, prescription, true);
  assert.equal(first.kind, "establish");
  assert.equal(first.weightKg, null);
  assert.match(first.note, /5–8/);

  const cleared = getProgressionTarget(
    {
      date: "2026-08-17",
      sets: [
        { reps: 8, weightKg: 60 },
        { reps: 8, weightKg: 60 },
        { reps: 8, weightKg: 60 },
      ],
      topWeightKg: 60,
    },
    prescription,
    true,
  );
  assert.equal(cleared.kind, "load");
  assert.equal(cleared.weightKg, 62.5);
  assert.equal(cleared.reps, 5);

  // An isolation exercise moves in smaller steps, rounded to half a kilo.
  const isolation = getProgressionTarget(
    {
      date: "2026-08-17",
      sets: [
        { reps: 8, weightKg: 10 },
        { reps: 8, weightKg: 10 },
        { reps: 8, weightKg: 10 },
      ],
      topWeightKg: 10,
    },
    prescription,
    false,
  );
  assert.equal(isolation.kind, "load");
  assert.equal(isolation.weightKg, 11.5);

  const short = getProgressionTarget(
    {
      date: "2026-08-17",
      sets: [
        { reps: 7, weightKg: 60 },
        { reps: 6, weightKg: 60 },
        { reps: 6, weightKg: 60 },
      ],
      topWeightKg: 60,
    },
    prescription,
    true,
  );
  assert.equal(short.kind, "reps");
  assert.equal(short.reps, 8);
  assert.equal(short.weightKg, 60);

  // One set missing is not a cleared range, however good the reps were.
  const missing = getProgressionTarget(
    {
      date: "2026-08-17",
      sets: [
        { reps: 9, weightKg: 60 },
        { reps: 9, weightKg: 60 },
      ],
      topWeightKg: 60,
    },
    prescription,
    true,
  );
  assert.equal(missing.kind, "reps");
  assert.equal(missing.reps, 8);

  const bodyweight = getProgressionTarget(
    {
      date: "2026-08-17",
      sets: [
        { reps: 8, weightKg: 0 },
        { reps: 8, weightKg: 0 },
        { reps: 8, weightKg: 0 },
      ],
      topWeightKg: 0,
    },
    prescription,
    true,
  );
  assert.equal(bodyweight.kind, "sets");
  assert.equal(bodyweight.sets, 4);
  assert.equal(bodyweight.weightKg, 0);
});

test("the block decides which days are training days", () => {
  const input = profile({
    availableDays: ["monday", "tuesday", "thursday", "friday", "sunday"],
    goal: "muscle_gain",
  });
  const block = buildBlock(input, 1)!;
  const payload = buildFitnessPlanPayload(input, block);

  assert.equal(payload.length, 7);
  const gymDays = payload
    .filter((row) => row.sport === "gym")
    .map((row) => row.weekday);
  assert.deepEqual(
    gymDays,
    block.sessions.map((session) => session.weekday).sort(
      (a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b),
    ),
  );

  // A gym day the programme has no session for would be a day with nothing
  // prescribed, which is the hole this whole feature exists to close.
  const stray = payload.filter(
    (row) =>
      row.sport === "gym" &&
      !block.sessions.some((session) => session.weekday === row.weekday),
  );
  assert.deepEqual(stray, []);

  for (const row of payload) {
    if (row.sport === "gym") {
      assert.match(row.notes, /^Block 1 · /);
      assert.equal(row.planned_duration_minutes, input.sessionLengthMinutes);
    }
  }
});

test("last time reads as a sentence, not a table", () => {
  const year = new Date().getUTCFullYear();
  assert.equal(
    formatLastPerformance({
      date: `${year}-08-17`,
      sets: [
        { reps: 8, weightKg: 60 },
        { reps: 8, weightKg: 60 },
        { reps: 7, weightKg: 60 },
      ],
      topWeightKg: 60,
    }),
    "17 Aug · 8, 8, 7 @ 60 kg",
  );
  assert.equal(
    formatLastPerformance({
      date: `${year}-01-02`,
      sets: [{ reps: 12, weightKg: 0 }],
      topWeightKg: 0,
    }),
    "2 Jan · 12 bodyweight",
  );
  // A weight that moved between sets is shown as it happened.
  assert.equal(
    formatLastPerformance({
      date: `${year}-03-05`,
      sets: [
        { reps: 8, weightKg: 20 },
        { reps: 6, weightKg: 22.5 },
      ],
      topWeightKg: 22.5,
    }),
    "5 Mar · 8, 6 @ 20/22.5 kg",
  );
  assert.equal(formatLastPerformance(null), "");
});
