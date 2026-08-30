import {
  EXERCISES,
  expandEquipment,
  isAvoided,
  MUSCLE_GROUPS,
  type Exercise,
  type MuscleGroup,
  parseAvoidList,
} from "@/lib/exercises";
import type { FitnessProfile } from "@/lib/fitness-setup";
import { type WeekdayId, weekdayOrder } from "@/lib/fitness";
import {
  getSplitForBlock,
  type SplitSlot,
  type TrainingSplit,
} from "@/lib/training-split";

/**
 * A training block.
 *
 * Six weeks of the same sessions, then a different split. That is the whole
 * idea, and both halves of it matter: the same sessions because a week you
 * cannot compare to last week tells you nothing about whether you are getting
 * stronger, and a different split afterwards because six weeks is about as
 * long as one shape keeps paying.
 *
 * Everything here is pure. The block is *built* from the profile once, at the
 * moment it starts, and then written down — the one place this codebase stores
 * instead of deriving, and deliberately. A commitment recomputed from a profile
 * that changed in week three is not a commitment.
 *
 * Two things this never does: pick a load for you, and change a load on its
 * own. `getProgressionTarget` returns a suggestion to show beside the input.
 * What goes in the input is typed by the person doing the lifting.
 */

export type BlockPhase = "hypertrophy" | "strength";

export type BlockPrescription = {
  exerciseId: string;
  position: number;
  /** Why this exercise and not another one. Shown, never hidden. */
  reason: string;
  repHigh: number;
  repLow: number;
  targetSets: number;
};

export type BlockSessionPlan = {
  label: string;
  prescriptions: BlockPrescription[];
  slot: number;
  weekday: WeekdayId;
};

export type MuscleCoverage = Record<MuscleGroup, number>;

export type BuiltBlock = {
  blockIndex: number;
  coverage: MuscleCoverage;
  /** Minutes the longest session runs over the profile's session length. */
  overrunMinutes: number;
  phase: BlockPhase;
  sessions: BlockSessionPlan[];
  splitId: string;
  splitName: string;
  /** Slots nothing could fill, and why. Never silently dropped. */
  unfilled: Array<{ label: string; muscle: MuscleGroup; reason: string }>;
  weeks: number;
};

export const BLOCK_WEEKS = 6;

/** The rule the whole system exists to keep. */
export const WEEKLY_FREQUENCY_TARGET = 2;

const REP_RANGES: Record<
  BlockPhase,
  Record<SplitSlot["role"], { repHigh: number; repLow: number; sets: number }>
> = {
  hypertrophy: {
    accessory: { repHigh: 15, repLow: 12, sets: 3 },
    compound: { repHigh: 12, repLow: 8, sets: 4 },
  },
  strength: {
    accessory: { repHigh: 12, repLow: 8, sets: 3 },
    compound: { repHigh: 8, repLow: 5, sets: 4 },
  },
};

/** Warm-up plus roughly two and a half minutes a set, rest included. */
const WARMUP_MINUTES = 8;
const MINUTES_PER_SET = 2.5;

function emptyCoverage(): MuscleCoverage {
  return Object.fromEntries(
    MUSCLE_GROUPS.map((muscle) => [muscle, 0]),
  ) as MuscleCoverage;
}

/**
 * How many gym days the week can carry. Fewer than two is not a judgement
 * about effort — with one session there is no arrangement of exercises that
 * trains every muscle group twice, so the honest answer is to say so.
 */
export function chooseGymDayCount(profile: FitnessProfile): number {
  const available = profile.availableDays.length;
  if (available <= 1) return 0;
  if (available === 2) return profile.sessionLengthMinutes >= 60 ? 2 : 0;
  if (profile.goal === "conditioning" || profile.goal === "mobility") {
    return Math.min(available, 3);
  }
  if (available <= 4) return available;
  if (available === 5) return profile.experience === "beginner" ? 4 : 5;
  return profile.experience === "advanced" ? 6 : 5;
}

/**
 * Spread the sessions across the days that are free, so two hard days rarely
 * land back to back. It spaces across the *available* list, not the calendar:
 * with Monday, Tuesday and Saturday free, two sessions are Monday and Saturday.
 */
export function chooseGymWeekdays(
  availableDays: WeekdayId[],
  count: number,
): WeekdayId[] {
  const ordered = weekdayOrder.filter((day) => availableDays.includes(day));
  if (count <= 0 || ordered.length === 0) return [];
  if (count >= ordered.length) return ordered;

  const picked: WeekdayId[] = [];
  for (let index = 0; index < count; index += 1) {
    const position = Math.round((index * (ordered.length - 1)) / (count - 1));
    let day = ordered[position];
    let step = position;
    while (picked.includes(day) && step + 1 < ordered.length) {
      step += 1;
      day = ordered[step];
    }
    if (!picked.includes(day)) picked.push(day);
  }
  // A collision at the end of the list falls back to whatever is still free.
  for (const day of ordered) {
    if (picked.length >= count) break;
    if (!picked.includes(day)) picked.push(day);
  }
  return weekdayOrder.filter((day) => picked.includes(day));
}

type SelectionContext = {
  avoid: string[];
  blockIndex: number;
  equipment: Set<string>;
  ordinal: number;
  usedInSession: Set<string>;
};

function selectExercise(
  slot: SplitSlot,
  context: SelectionContext,
): { exercise: Exercise; reason: string } | null {
  const pool = EXERCISES.filter(
    (exercise) =>
      exercise.equipment.some((item) => context.equipment.has(item)) &&
      !isAvoided(exercise, context.avoid),
  );

  const tiers: Array<{ list: Exercise[]; reason: string }> = [
    {
      list: pool.filter(
        (exercise) =>
          exercise.pattern === slot.pattern &&
          exercise.primaryMuscle === slot.muscle,
      ),
      reason: `${slot.muscle} on a ${slot.pattern.replace("-", " ")} movement, from your equipment`,
    },
    {
      list: pool.filter((exercise) => exercise.primaryMuscle === slot.muscle),
      reason: `${slot.muscle}, from your equipment — no ${slot.pattern.replace("-", " ")} option fits it`,
    },
    {
      list: pool.filter((exercise) =>
        exercise.secondaryMuscles.includes(slot.muscle),
      ),
      reason: `the closest thing to ${slot.muscle} your equipment allows`,
    },
  ];

  for (const tier of tiers) {
    if (tier.list.length === 0) continue;
    const fresh = tier.list.filter(
      (exercise) => !context.usedInSession.has(exercise.id),
    );
    const candidates = fresh.length > 0 ? fresh : tier.list;
    const exercise =
      candidates[
        (context.blockIndex - 1 + context.ordinal) % candidates.length
      ];
    return { exercise, reason: tier.reason };
  }
  return null;
}

export function getMuscleCoverage(
  sessions: BlockSessionPlan[],
): MuscleCoverage {
  const coverage = emptyCoverage();
  for (const session of sessions) {
    for (const prescription of session.prescriptions) {
      const exercise = EXERCISES.find(
        (item) => item.id === prescription.exerciseId,
      );
      if (exercise) coverage[exercise.primaryMuscle] += 1;
    }
  }
  return coverage;
}

/** What the split *promises*, before any exercise is chosen. */
export function getSplitCoverage(split: TrainingSplit): MuscleCoverage {
  const coverage = emptyCoverage();
  for (const session of split.sessions) {
    for (const slot of session.slots) coverage[slot.muscle] += 1;
  }
  return coverage;
}

export function meetsFrequencyRule(coverage: MuscleCoverage) {
  const missing = MUSCLE_GROUPS.filter((muscle) => coverage[muscle] === 0);
  const under = MUSCLE_GROUPS.filter(
    (muscle) =>
      coverage[muscle] > 0 && coverage[muscle] < WEEKLY_FREQUENCY_TARGET,
  );
  return { missing, ok: missing.length === 0 && under.length === 0, under };
}

function estimateMinutes(session: BlockSessionPlan) {
  const sets = session.prescriptions.reduce(
    (total, prescription) => total + prescription.targetSets,
    0,
  );
  return WARMUP_MINUTES + sets * MINUTES_PER_SET;
}

function choosePhase(profile: FitnessProfile, blockIndex: number): BlockPhase {
  if (profile.goal === "strength") return "strength";
  if (profile.goal === "muscle_gain") return "hypertrophy";
  return blockIndex % 2 === 1 ? "strength" : "hypertrophy";
}

/**
 * Build the block. Deterministic: the same profile and block index give the
 * same programme, byte for byte, which is what lets the screen and the
 * database agree without either of them storing the other's answer.
 */
export function buildBlock(
  profile: FitnessProfile,
  blockIndex: number,
): BuiltBlock | null {
  const gymDays = chooseGymDayCount(profile);
  const split = getSplitForBlock(gymDays, blockIndex);
  if (!split) return null;

  const weekdays = chooseGymWeekdays(profile.availableDays, gymDays);
  if (weekdays.length < gymDays) return null;

  const phase = choosePhase(profile, blockIndex);
  const equipment = expandEquipment(profile.equipment) as Set<string>;
  const avoid = parseAvoidList(profile.exercisesToAvoid);
  const unfilled: BuiltBlock["unfilled"] = [];
  let ordinal = 0;

  const sessions: BlockSessionPlan[] = split.sessions.map(
    (splitSession, slot) => {
      const usedInSession = new Set<string>();
      const prescriptions: BlockPrescription[] = [];

      for (const splitSlot of splitSession.slots) {
        const picked = selectExercise(splitSlot, {
          avoid,
          blockIndex,
          equipment,
          ordinal,
          usedInSession,
        });
        ordinal += 1;
        if (!picked) {
          unfilled.push({
            label: splitSession.label,
            muscle: splitSlot.muscle,
            reason:
              "Nothing in the library trains it with the equipment you have and the exercises you avoid.",
          });
          continue;
        }
        usedInSession.add(picked.exercise.id);
        const range = REP_RANGES[phase][splitSlot.role];
        prescriptions.push({
          exerciseId: picked.exercise.id,
          position: prescriptions.length,
          reason: picked.reason,
          repHigh: range.repHigh,
          repLow: range.repLow,
          targetSets: range.sets,
        });
      }

      return {
        label: splitSession.label,
        prescriptions,
        slot,
        weekday: weekdays[slot],
      };
    },
  );

  trimToSessionLength(sessions, profile.sessionLengthMinutes);

  const overrunMinutes = Math.max(
    0,
    Math.round(
      Math.max(...sessions.map(estimateMinutes)) - profile.sessionLengthMinutes,
    ),
  );

  return {
    blockIndex,
    coverage: getMuscleCoverage(sessions),
    overrunMinutes,
    phase,
    sessions,
    splitId: split.id,
    splitName: split.name,
    unfilled,
    weeks: BLOCK_WEEKS,
  };
}

/**
 * Drop accessories until the sessions fit the time on offer — but never a
 * accessory whose muscle would then fall under twice a week. A shorter session
 * is a compromise; a muscle group trained once is a broken promise.
 */
function trimToSessionLength(
  sessions: BlockSessionPlan[],
  sessionLengthMinutes: number,
) {
  for (let guard = 0; guard < 40; guard += 1) {
    const coverage = getMuscleCoverage(sessions);
    const longest = sessions
      .filter((session) => estimateMinutes(session) > sessionLengthMinutes)
      .sort((a, b) => estimateMinutes(b) - estimateMinutes(a))[0];
    if (!longest) return;

    let removed = false;
    for (let index = longest.prescriptions.length - 1; index >= 0; index -= 1) {
      const prescription = longest.prescriptions[index];
      const exercise = EXERCISES.find(
        (item) => item.id === prescription.exerciseId,
      );
      if (!exercise) continue;
      if (coverage[exercise.primaryMuscle] <= WEEKLY_FREQUENCY_TARGET) continue;
      longest.prescriptions.splice(index, 1);
      longest.prescriptions.forEach((item, position) => {
        item.position = position;
      });
      removed = true;
      break;
    }
    if (!removed) return;
  }
}

// ------------------------------------------------------------- the weeks --

function toUtcDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

function daysBetween(from: string, to: string) {
  return Math.floor(
    (toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000,
  );
}

/** Week 1 on the day it starts, week 6 on day 35, week 7 the day it is over. */
export function getBlockWeek(startedOn: string, today: string) {
  return Math.max(1, Math.floor(daysBetween(startedOn, today) / 7) + 1);
}

export function isBlockFinished(
  block: { startedOn: string; weeks: number },
  today: string,
) {
  return daysBetween(block.startedOn, today) >= block.weeks * 7;
}

// ------------------------------------------------------------ the numbers --

export type ExerciseSet = {
  exerciseId: string;
  performedOn: string;
  reps: number;
  setIndex: number;
  weightKg: number;
};

export type LastPerformance = {
  date: string;
  sets: Array<{ reps: number; weightKg: number }>;
  topWeightKg: number;
};

/**
 * The last day this exercise was actually done — the whole day, not the last
 * row, so all three sets are shown the way they were performed.
 */
export function getLastPerformance(
  sets: ExerciseSet[],
  exerciseId: string,
  beforeDate: string,
): LastPerformance | null {
  const rows = sets.filter(
    (set) => set.exerciseId === exerciseId && set.performedOn < beforeDate,
  );
  if (rows.length === 0) return null;

  const date = rows.reduce(
    (latest, set) => (set.performedOn > latest ? set.performedOn : latest),
    rows[0].performedOn,
  );
  const onThatDay = rows
    .filter((set) => set.performedOn === date)
    .sort((a, b) => a.setIndex - b.setIndex);

  return {
    date,
    sets: onThatDay.map((set) => ({ reps: set.reps, weightKg: set.weightKg })),
    topWeightKg: onThatDay.reduce(
      (top, set) => Math.max(top, set.weightKg),
      0,
    ),
  };
}

export type ProgressionTarget = {
  kind: "establish" | "load" | "reps" | "sets";
  note: string;
  reps: number;
  sets: number | null;
  weightKg: number | null;
};

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

/**
 * The next small step, as a sentence beside the input — never typed into it.
 * Everything at the top of the range means add weight and start the range
 * again; anything else means one more repetition than last time.
 */
export function getProgressionTarget(
  last: LastPerformance | null,
  prescription: Pick<BlockPrescription, "repHigh" | "repLow" | "targetSets">,
  isCompound: boolean,
): ProgressionTarget {
  if (!last || last.sets.length === 0) {
    return {
      kind: "establish",
      note: `First time. Find a weight you can do ${prescription.repLow}–${prescription.repHigh} with two reps left in the tank.`,
      reps: prescription.repLow,
      sets: prescription.targetSets,
      weightKg: null,
    };
  }

  const cleared =
    last.sets.length >= prescription.targetSets &&
    last.sets.every((set) => set.reps >= prescription.repHigh);

  if (cleared) {
    const bodyweight = last.sets.every((set) => set.weightKg === 0);
    if (bodyweight) {
      const sets = Math.min(prescription.targetSets + 1, 5);
      return {
        kind: "sets",
        note: `You cleared the range with no weight — add a set: ${sets} × ${prescription.repHigh}.`,
        reps: prescription.repHigh,
        sets,
        weightKg: 0,
      };
    }
    const step = isCompound ? 2.5 : 1.25;
    const weightKg = roundToHalf(last.topWeightKg + step);
    return {
      kind: "load",
      note: `You cleared the range — try ${weightKg} kg and start again at ${prescription.repLow}.`,
      reps: prescription.repLow,
      sets: prescription.targetSets,
      weightKg,
    };
  }

  const best = last.sets.reduce((top, set) => Math.max(top, set.reps), 0);
  const reps = Math.min(prescription.repHigh, best + 1);
  return {
    kind: "reps",
    note:
      last.topWeightKg > 0
        ? `Same ${last.topWeightKg} kg, one more rep: ${reps}.`
        : `One more rep than last time: ${reps}.`,
    reps,
    sets: prescription.targetSets,
    weightKg: last.topWeightKg,
  };
}
