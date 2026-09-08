import assert from "node:assert/strict";
import test from "node:test";
import {
  REST_COMPOUND_SECONDS,
  REST_HEAVY_SECONDS,
  REST_ISOLATION_SECONDS,
  describeRest,
  formatRest,
  restProgress,
  restSecondsFor,
} from "../src/lib/rest-timer";
import {
  ONE_RM_REP_LIMIT,
  bestOneRepMax,
  estimateOneRepMax,
  formatKg,
  formatOneRepMax,
} from "../src/lib/one-rm";
import { EXERCISES } from "../src/lib/exercises";

test("a heavy compound rests longest and an isolation shortest", () => {
  assert.equal(
    restSecondsFor({ isCompound: true, repHigh: 5 }),
    REST_HEAVY_SECONDS,
  );
  assert.equal(
    restSecondsFor({ isCompound: true, repHigh: 10 }),
    REST_COMPOUND_SECONDS,
  );
  assert.equal(
    restSecondsFor({ isCompound: false, repHigh: 5 }),
    REST_ISOLATION_SECONDS,
  );
});

test("every exercise in the library gets a rest a human would recognise", () => {
  for (const exercise of EXERCISES) {
    const rest = restSecondsFor({ isCompound: exercise.isCompound, repHigh: 8 });
    assert.ok(rest >= 60 && rest <= 300, `${exercise.id} rests ${rest}s`);
  }
});

test("the clock reads as a clock", () => {
  assert.equal(formatRest(180), "3:00");
  assert.equal(formatRest(90), "1:30");
  assert.equal(formatRest(9), "0:09");
  assert.equal(formatRest(0), "0:00");
  assert.equal(formatRest(-5), "0:00");
});

test("the spoken form is spoken, not punctuated", () => {
  assert.equal(describeRest(90), "1 minute 30 seconds left");
  assert.equal(describeRest(120), "2 minutes left");
  assert.equal(describeRest(1), "1 second left");
  assert.equal(describeRest(0), "Rest over");
});

test("progress runs from nothing to full and never past either end", () => {
  assert.equal(restProgress(120, 120), 0);
  assert.equal(restProgress(60, 120), 0.5);
  assert.equal(restProgress(0, 120), 1);
  assert.equal(restProgress(-10, 120), 1);
  assert.equal(restProgress(130, 120), 0);
  assert.equal(restProgress(30, 0), 1);
});

test("the one-rep-max estimate follows Epley", () => {
  assert.equal(estimateOneRepMax(1, 100), 100);
  assert.equal(estimateOneRepMax(5, 100), 116.7);
  assert.equal(estimateOneRepMax(10, 60), 80);
});

test("a set that cannot support an estimate does not get one", () => {
  assert.equal(estimateOneRepMax(ONE_RM_REP_LIMIT + 1, 60), null);
  assert.equal(estimateOneRepMax(0, 60), null);
  assert.equal(estimateOneRepMax(8, 0), null, "bodyweight has no load");
  assert.equal(estimateOneRepMax(Number.NaN, 60), null);
});

test("the best estimate is the strongest set, not the heaviest", () => {
  const best = bestOneRepMax([
    { performedOn: "2026-09-01", reps: 3, weightKg: 100 },
    { performedOn: "2026-09-08", reps: 10, weightKg: 85 },
    { performedOn: "2026-09-15", reps: 20, weightKg: 40 },
  ]);
  assert.equal(best?.performedOn, "2026-09-08");
  assert.equal(best?.value, 113.3);
});

test("no set with an estimate means no estimate at all", () => {
  assert.equal(bestOneRepMax([]), null);
  assert.equal(bestOneRepMax([{ reps: 15, weightKg: 40 }]), null);
});

test("the line mentions a best only when it is genuinely above today", () => {
  const today = { performedOn: "2026-09-08", reps: 5, weightKg: 100, value: 116.7 };
  assert.equal(formatOneRepMax(today, today), "Est. 1RM 116.7 kg");
  assert.equal(
    formatOneRepMax(today, { ...today, value: 117.2 }),
    "Est. 1RM 116.7 kg",
    "half a kilo apart is the same number rounded differently",
  );
  assert.equal(
    formatOneRepMax(today, { ...today, value: 125 }),
    "Est. 1RM 116.7 kg · best 125 kg",
  );
  assert.equal(formatOneRepMax(null, today), "");
});

test("kilograms lose a pointless trailing zero", () => {
  assert.equal(formatKg(80), "80 kg");
  assert.equal(formatKg(82.5), "82.5 kg");
  assert.equal(formatKg(116.66), "116.7 kg");
});
