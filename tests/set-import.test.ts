import assert from "node:assert/strict";
import test from "node:test";
import {
  IMPORT_ROW_LIMIT,
  describeImport,
  detectDelimiter,
  matchExerciseName,
  parseDay,
  parseSetExport,
  splitRow,
} from "../src/lib/set-import";

const TODAY = "2026-09-08";

const strong = [
  '"Date","Workout Name","Exercise Name","Set Order","Weight","Reps","RPE"',
  '"2026-08-17 18:30:00","Push","Bench Press (Barbell)","1","60","8",""',
  '"2026-08-17 18:30:00","Push","Bench Press (Barbell)","2","60","8",""',
  '"2026-08-17 18:30:00","Push","Lateral Raise (Dumbbell)","1","10","15",""',
  '"2026-08-19 18:30:00","Pull","Deadlift (Barbell)","1","120","5",""',
].join("\n");

test("a Strong export lands, matched onto Orbit's own exercises", () => {
  const preview = parseSetExport(strong, TODAY);
  assert.equal(preview.rows.length, 4);
  assert.equal(preview.days, 2);
  assert.equal(preview.firstDay, "2026-08-17");
  assert.equal(preview.lastDay, "2026-08-19");
  assert.deepEqual(preview.unmatched, []);

  // "Bench Press (Barbell)" is the curated barbell bench press, not a
  // catalogue entry: a set logged against the curated id is the one the
  // programme's own "last time" line can see.
  assert.equal(preview.rows[0].exerciseId, "barbell-bench-press");
  assert.equal(preview.rows[3].exerciseId, "deadlift");
  assert.equal(preview.rows[0].weightKg, 60);
  assert.equal(preview.rows[0].reps, 8);
});

test("set numbers restart per exercise per day", () => {
  const preview = parseSetExport(strong, TODAY);
  const bench = preview.rows.filter(
    (row) => row.exerciseId === "barbell-bench-press",
  );
  assert.deepEqual(
    bench.map((row) => row.setIndex),
    [1, 2],
  );
  assert.equal(
    preview.rows.find((row) => row.exerciseId === "lateral-raise")?.setIndex,
    1,
  );
});

test("a Hevy export lands too, and its warm-ups do not", () => {
  const hevy = [
    "title,start_time,exercise_title,set_index,set_type,weight_kg,reps",
    "Legs,2026-09-01 07:00:00,Back Squat,0,warmup,40,10",
    "Legs,2026-09-01 07:00:00,Back Squat,1,normal,100,5",
    "Legs,2026-09-01 07:00:00,Back Squat,2,normal,100,5",
  ].join("\n");
  const preview = parseSetExport(hevy, TODAY);
  assert.equal(preview.rows.length, 2);
  assert.equal(preview.rows[0].exerciseId, "back-squat");
  assert.equal(preview.rows[0].weightKg, 100);
  assert.ok(
    preview.rejections.some((item) => item.reason.includes("Warm-up")),
    "the dropped warm-ups have to be reported, not silently lost",
  );
});

test("pounds become kilograms when the column says so", () => {
  const csv = [
    "Date,Exercise Name,Weight (lbs),Reps",
    "2026-08-17,Deadlift,225,5",
  ].join("\n");
  const preview = parseSetExport(csv, TODAY);
  assert.equal(preview.rows[0].weightKg, 102.06);
});

test("a name nothing answers to is reported rather than dropped in silence", () => {
  const csv = [
    "Date,Exercise Name,Weight,Reps",
    "2026-08-17,Reverse Hyper Machine Thing,50,10",
    "2026-08-17,Reverse Hyper Machine Thing,50,10",
    "2026-08-17,Bench Press (Barbell),60,8",
  ].join("\n");
  const preview = parseSetExport(csv, TODAY);
  assert.equal(preview.rows.length, 1);
  assert.deepEqual(preview.unmatched, [
    { count: 2, name: "Reverse Hyper Machine Thing" },
  ]);
});

test("a row Orbit cannot fully believe is rejected with a reason", () => {
  const csv = [
    "Date,Exercise Name,Weight,Reps",
    "not a date,Bench Press (Barbell),60,8",
    "2027-01-01,Bench Press (Barbell),60,8",
    "2026-08-17,Bench Press (Barbell),60,0",
    "2026-08-17,Bench Press (Barbell),900,8",
    "2026-08-17,Bench Press (Barbell),60,8",
  ].join("\n");
  const preview = parseSetExport(csv, TODAY);
  assert.equal(preview.rows.length, 1);
  const reasons = preview.rejections.map((item) => item.reason).join(" | ");
  assert.match(reasons, /no date/);
  assert.match(reasons, /future/);
  assert.match(reasons, /reps outside/);
  assert.match(reasons, /over 500 kg/);
});

test("more than ten sets of one exercise in a day cannot be stored", () => {
  const rows = Array.from(
    { length: 12 },
    () => "2026-08-17,Bench Press (Barbell),60,8",
  );
  const preview = parseSetExport(
    ["Date,Exercise Name,Weight,Reps", ...rows].join("\n"),
    TODAY,
  );
  assert.equal(preview.rows.length, 10);
  assert.ok(preview.rejections.some((item) => item.reason.includes("10 sets")));
});

test("a file is capped, and says it was", () => {
  const rows = Array.from(
    { length: IMPORT_ROW_LIMIT + 5 },
    // Spread over days, or the ten-a-day cap would stop the file long before
    // the row limit does and this would be testing the wrong rule.
    (_, index) => {
      const day = Math.floor(index / 10);
      const month = Math.floor(day / 28) + 1;
      return `2026-0${month}-${String((day % 28) + 1).padStart(2, "0")},Bench Press (Barbell),60,8`;
    },
  );
  const preview = parseSetExport(
    ["Date,Exercise Name,Weight,Reps", ...rows].join("\n"),
    TODAY,
  );
  assert.ok(preview.rows.length <= IMPORT_ROW_LIMIT);
  assert.ok(
    preview.rejections.some((item) => item.reason.includes("first")),
    "silently truncating someone's history would be the worst thing here",
  );
});

test("a file with no usable columns says which ones it wanted", () => {
  const preview = parseSetExport("a,b,c\n1,2,3", TODAY);
  assert.equal(preview.rows.length, 0);
  assert.match(preview.rejections[0].reason, /date, exercise and reps/);
});

test("an empty file is not an error worth a stack trace", () => {
  assert.equal(parseSetExport("", TODAY).rows.length, 0);
  assert.equal(parseSetExport("Date,Exercise Name,Reps", TODAY).rows.length, 0);
});

test("a quoted exercise name keeps its comma", () => {
  assert.deepEqual(splitRow('a,"b, still b",c', ","), ["a", "b, still b", "c"]);
  assert.deepEqual(splitRow('"he said ""hi""",x', ","), ['he said "hi"', "x"]);
});

test("the delimiter is whichever one the header actually uses", () => {
  assert.equal(detectDelimiter("a,b,c"), ",");
  assert.equal(detectDelimiter("a;b;c;d"), ";");
  assert.equal(detectDelimiter("a\tb\tc\td\te"), "\t");
});

test("only unambiguous dates are accepted", () => {
  assert.equal(parseDay("2026-08-17"), "2026-08-17");
  assert.equal(parseDay("2026-08-17 18:30:00"), "2026-08-17");
  assert.equal(parseDay("2026-08-17T18:30:00Z"), "2026-08-17");
  assert.equal(parseDay("17/08/2026"), "2026-08-17");
  assert.equal(parseDay("2026-02-30"), null, "a day that does not exist");
  assert.equal(parseDay("Aug 17 2026"), null, "month-first is a guess");
  assert.equal(parseDay(""), null);
});

test("names match across word order and punctuation", () => {
  assert.equal(matchExerciseName("Barbell Bench Press"), "barbell-bench-press");
  assert.equal(matchExerciseName("Bench Press (Barbell)"), "barbell-bench-press");
  assert.equal(matchExerciseName("  barbell   bench   press  "), "barbell-bench-press");
  assert.equal(matchExerciseName("Nothing Like This At All"), null);
  assert.equal(matchExerciseName(""), null);
});

test("a piece of equipment is a qualifier; anything else is a variant", () => {
  // "Lateral Raise (Dumbbell)" is Orbit's lateral raise with the equipment
  // written after it, so it lands on the curated lift the programme uses.
  assert.equal(matchExerciseName("Lateral Raise (Dumbbell)"), "lateral-raise");
  assert.equal(matchExerciseName("Deadlift (Barbell)"), "deadlift");

  // "Incline" is not equipment. Folding an incline press into the flat bench
  // would put the wrong numbers in its history and in every estimate from it.
  assert.notEqual(
    matchExerciseName("Incline Bench Press (Barbell)"),
    "barbell-bench-press",
  );
});

test("a name that does not say which lift it means matches nothing", () => {
  // Barbell, dumbbell and close-grip bench presses are all "bench press", and
  // a coin toss between them would be a coin toss with someone's history.
  assert.equal(matchExerciseName("Bench Press"), null);
});

test("a name only the catalogue knows still finds its way home", () => {
  const id = matchExerciseName("Cable Kneeling Crunch");
  assert.ok(id?.startsWith("cat-"), `got ${id}`);
});

test("the summary is a sentence, including when there is nothing to say", () => {
  const preview = parseSetExport(strong, TODAY);
  assert.equal(describeImport(preview), "4 sets across 2 days, 2026-08-17 to 2026-08-19.");
  assert.equal(
    describeImport(parseSetExport("", TODAY)),
    "Nothing in this file can be imported.",
  );
});
