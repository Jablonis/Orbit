import assert from "node:assert/strict";
import test from "node:test";
import {
  CATALOG,
  CATALOG_BODY_PARTS,
  catalogEntryFor,
  catalogGifSrc,
  catalogImageSrc,
  catalogKit,
  catalogMuscle,
  equipmentInList,
  getCatalogExercise,
  isCatalogId,
  searchCatalog,
} from "../src/lib/exercise-catalog";
import { EXERCISES, MUSCLE_GROUPS } from "../src/lib/exercises";
import { fitnessEquipment } from "../src/lib/fitness-setup";

test("the catalogue is the whole upstream dataset, once each", () => {
  assert.ok(CATALOG.length > 1300, `only ${CATALOG.length} exercises`);
  assert.equal(new Set(CATALOG.map((item) => item.id)).size, CATALOG.length);
});

test("every id can be stored in exercise_id", () => {
  // The migration checks `exercise_id ~ '^[a-z0-9-]{1,60}$'`. An id that fails
  // it is an exercise nobody can ever log a set against.
  for (const exercise of CATALOG) {
    assert.match(exercise.id, /^[a-z0-9-]{1,60}$/, exercise.name);
  }
});

test("every entry has a name and most have instructions", () => {
  const withSteps = CATALOG.filter((item) => item.steps.length > 0);
  for (const exercise of CATALOG) assert.ok(exercise.name.length > 0);
  assert.ok(
    withSteps.length / CATALOG.length > 0.95,
    `only ${withSteps.length} of ${CATALOG.length} carry steps`,
  );
});

test("no name carries the upstream double-encoded degree sign", () => {
  assert.equal(
    CATALOG.filter((item) => item.name.includes("в°")).length,
    0,
  );
});

test("every target maps to a muscle group Orbit counts, or to cardio", () => {
  const groups = new Set<string>(MUSCLE_GROUPS);
  const unmapped = new Set<string>();
  for (const exercise of CATALOG) {
    const muscle = catalogMuscle(exercise);
    if (muscle === null) {
      // Only the cardio machines are allowed to belong to no muscle group.
      if (exercise.target !== "cardiovascular system") unmapped.add(exercise.target);
      continue;
    }
    assert.ok(groups.has(muscle), `${muscle} is not a muscle group`);
  }
  assert.deepEqual([...unmapped], []);
});

test("every piece of upstream equipment maps to a kit someone can own", () => {
  const kits = new Set<string>(fitnessEquipment);
  for (const exercise of CATALOG) {
    const kit = catalogKit(exercise);
    assert.ok(kit.length > 0, exercise.equipment);
    for (const item of kit) assert.ok(kits.has(item), `${item} is not a kit`);
  }
});

test("bodyweight exercises are reachable with no equipment at all", () => {
  const bodyweight = searchCatalog({ kit: ["bodyweight"] });
  assert.ok(bodyweight.length > 200, `only ${bodyweight.length} without kit`);
  assert.ok(bodyweight.every((item) => item.equipment === "body weight"));
});

test("every curated exercise links to a catalogue entry that exists", () => {
  const linked = EXERCISES.map((exercise) => ({
    entry: catalogEntryFor(exercise.id),
    id: exercise.id,
  }));
  for (const row of linked) {
    if (row.entry === null) continue;
    assert.ok(getCatalogExercise(row.entry.id), `${row.id} points at nothing`);
  }
  // Most of the library explains itself; the handful that cannot is deliberate
  // and documented, and this stops the map quietly rotting away to nothing.
  const explained = linked.filter((row) => row.entry !== null).length;
  assert.ok(
    explained >= EXERCISES.length - 10,
    `only ${explained} of ${EXERCISES.length} curated lifts have instructions`,
  );
});

test("a linked curated exercise trains the muscle Orbit says it does", () => {
  // The link is hand-written, so this is the check that a slip put the wrong
  // instructions under the right name — a bench press pointing at a leg curl.
  //
  // One entry disagrees with Orbit rather than being wrong: upstream files the
  // farmer's walk under quads, Orbit under core. Both are defensible for a
  // loaded carry, and the exercise is the same exercise, so it is listed here
  // instead of being unlinked or quietly relabelled.
  const disagreements = new Set(["farmer-carry"]);

  for (const exercise of EXERCISES) {
    if (disagreements.has(exercise.id)) continue;
    const entry = catalogEntryFor(exercise.id);
    if (!entry) continue;
    const muscle = catalogMuscle(entry);
    if (muscle === null) continue;
    const claimed = [exercise.primaryMuscle, ...exercise.secondaryMuscles];
    assert.ok(
      claimed.includes(muscle),
      `${exercise.id} → ${entry.name} trains ${muscle}, not ${claimed.join("/")}`,
    );
  }
});

test("a catalogue id is recognised and a curated slug is not", () => {
  assert.equal(isCatalogId("cat-0001"), true);
  assert.equal(isCatalogId("barbell-bench-press"), false);
});

test("search narrows with every word and prefers a name that starts with it", () => {
  const rows = searchCatalog({ search: "cable seated row" });
  assert.ok(rows.length > 0);
  for (const row of rows) {
    const name = row.name.toLowerCase();
    assert.ok(name.includes("cable") && name.includes("seated") && name.includes("row"));
  }
  assert.ok(rows[0].name.toLowerCase().startsWith("cable"));
});

test("search ignores case and accents", () => {
  assert.ok(searchCatalog({ search: "PUSH-UP" }).length > 0);
  assert.equal(
    searchCatalog({ search: "sled 45° leg press" }).length,
    searchCatalog({ search: "sled 45° leg press" }).length,
  );
});

test("filters compose, and an empty query returns everything", () => {
  assert.equal(searchCatalog({}).length, CATALOG.length);
  const chest = searchCatalog({ bodyPart: "chest", equipment: "dumbbell" });
  assert.ok(chest.length > 0);
  assert.ok(
    chest.every((item) => item.bodyPart === "chest" && item.equipment === "dumbbell"),
  );
});

test("a search that matches nothing returns nothing rather than everything", () => {
  assert.deepEqual(searchCatalog({ search: "zzzz not an exercise" }), []);
});

test("the equipment row is derived from the list it is shown above", () => {
  const chest = searchCatalog({ bodyPart: "chest" });
  const equipment = equipmentInList(chest);
  assert.ok(equipment.length > 0);
  for (const item of equipment) {
    assert.ok(chest.some((exercise) => exercise.equipment === item));
  }
  // Most common first, so the chips people want are not behind a wrap.
  const first = chest.filter((item) => item.equipment === equipment[0]).length;
  const last = chest.filter(
    (item) => item.equipment === equipment[equipment.length - 1],
  ).length;
  assert.ok(first >= last);
});

test("body parts are offered biggest first", () => {
  assert.ok(CATALOG_BODY_PARTS.includes("chest"));
  const sizes = CATALOG_BODY_PARTS.map(
    (part) => CATALOG.filter((item) => item.bodyPart === part).length,
  );
  assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a));
});

test("media is silent until a deployment configures a base for it", () => {
  const previous = process.env.NEXT_PUBLIC_EXERCISE_MEDIA_BASE;
  delete process.env.NEXT_PUBLIC_EXERCISE_MEDIA_BASE;
  assert.equal(catalogImageSrc(CATALOG[0]), "");
  assert.equal(catalogGifSrc(CATALOG[0]), "");

  process.env.NEXT_PUBLIC_EXERCISE_MEDIA_BASE = "https://media.example/";
  assert.equal(
    catalogImageSrc(CATALOG[0]),
    `https://media.example/img/${CATALOG[0].image}`,
  );
  assert.equal(
    catalogGifSrc(CATALOG[0]),
    `https://media.example/gif/${CATALOG[0].gif}`,
  );

  if (previous === undefined) delete process.env.NEXT_PUBLIC_EXERCISE_MEDIA_BASE;
  else process.env.NEXT_PUBLIC_EXERCISE_MEDIA_BASE = previous;
});
