import assert from "node:assert/strict";
import test from "node:test";
import {
  EXERCISES,
  expandEquipment,
  MUSCLE_GROUPS,
} from "../src/lib/exercises";
import {
  getSplitForBlock,
  TRAINING_SPLITS,
} from "../src/lib/training-split";
import {
  buildBlock,
  getSplitCoverage,
  meetsFrequencyRule,
  WEEKLY_FREQUENCY_TARGET,
} from "../src/lib/training-block";
import {
  type FitnessEquipment,
  type FitnessExperience,
  type FitnessGoal,
  type FitnessProfile,
  fitnessExperiences,
  fitnessGoals,
} from "../src/lib/fitness-setup";
import { weekdayOrder } from "../src/lib/fitness";

test("every split trains every muscle group at least twice a week", () => {
  for (const split of TRAINING_SPLITS) {
    const coverage = getSplitCoverage(split);
    const verdict = meetsFrequencyRule(coverage);
    assert.ok(
      verdict.ok,
      `${split.id}: missing ${verdict.missing.join(", ") || "none"}, under ${verdict.under.join(", ") || "none"}`,
    );
    assert.equal(split.sessions.length, split.gymDays);
  }
});

test("each day count has two shapes, and consecutive blocks alternate", () => {
  for (const gymDays of [2, 3, 4, 5, 6]) {
    const options = TRAINING_SPLITS.filter(
      (split) => split.gymDays === gymDays,
    );
    assert.ok(options.length >= 2, `only ${options.length} splits for ${gymDays} days`);
    const first = getSplitForBlock(gymDays, 1);
    const second = getSplitForBlock(gymDays, 2);
    assert.ok(first && second);
    assert.notEqual(first.id, second.id);
    assert.equal(getSplitForBlock(gymDays, 3)?.id, first.id);
  }
});

const equipmentTiers: FitnessEquipment[][] = [
  ["bodyweight"],
  ["bands"],
  ["dumbbells"],
  ["full_gym"],
  ["dumbbells", "bands"],
];

test("the library fills every slot of every split at every equipment tier", () => {
  for (const owned of equipmentTiers) {
    const available = expandEquipment(owned) as Set<string>;
    const pool = EXERCISES.filter((exercise) =>
      exercise.equipment.some((item) => available.has(item)),
    );
    for (const split of TRAINING_SPLITS) {
      for (const session of split.sessions) {
        for (const slot of session.slots) {
          const exact = pool.some(
            (exercise) =>
              exercise.pattern === slot.pattern &&
              exercise.primaryMuscle === slot.muscle,
          );
          const byMuscle = pool.some(
            (exercise) => exercise.primaryMuscle === slot.muscle,
          );
          assert.ok(
            exact || byMuscle,
            `${owned.join("+")}: nothing for ${slot.muscle}/${slot.pattern} in ${split.id}`,
          );
        }
      }
    }
  }
});

const profile = (over: Partial<FitnessProfile> = {}): FitnessProfile => ({
  availableDays: ["monday", "wednesday", "friday"],
  equipment: ["full_gym"],
  exercisesToAvoid: "",
  experience: "intermediate",
  goal: "muscle_gain",
  sessionLengthMinutes: 60,
  templateId: "muscle_starter",
  ...over,
});

test("a built block keeps the twice-a-week rule across the whole matrix", () => {
  const dayCounts = [2, 3, 4, 5, 6, 7];
  let built = 0;

  for (const days of dayCounts) {
    for (const owned of equipmentTiers) {
      for (const experience of fitnessExperiences as readonly FitnessExperience[]) {
        for (const goal of fitnessGoals as readonly FitnessGoal[]) {
          for (const blockIndex of [1, 2, 3, 4]) {
            const block = buildBlock(
              profile({
                availableDays: weekdayOrder.slice(0, days),
                equipment: owned,
                experience,
                goal,
                sessionLengthMinutes: 90,
              }),
              blockIndex,
            );
            assert.ok(block, `no block for ${days} days / ${owned.join("+")}`);
            built += 1;
            assert.deepEqual(
              block.unfilled,
              [],
              `unfilled slots: ${JSON.stringify(block.unfilled)}`,
            );
            const verdict = meetsFrequencyRule(block.coverage);
            assert.ok(
              verdict.ok,
              `${days}d ${owned.join("+")} ${goal} block ${blockIndex}: missing ${verdict.missing.join(", ")}, under ${verdict.under.join(", ")}`,
            );
            for (const muscle of MUSCLE_GROUPS) {
              assert.ok(block.coverage[muscle] >= WEEKLY_FREQUENCY_TARGET);
            }
          }
        }
      }
    }
  }

  assert.ok(built > 500, `only ${built} combinations covered`);
});
