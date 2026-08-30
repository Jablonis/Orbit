import type { MovementPattern, MuscleGroup } from "@/lib/exercises";

/**
 * The splits.
 *
 * A split is a shape, not a workout: which muscle group is trained by which
 * movement on which day of the week. The exercises that fill the shape are
 * chosen later, from what the account actually owns.
 *
 * One rule governs every table here: **every muscle group appears at least
 * twice a week.** That is the whole reason the shapes are written out by hand
 * instead of generated — a table you can read is a table you can check, and
 * `tests/training-split.test.ts` checks all of them on every build.
 *
 * A block picks its split by `blockIndex`, so six weeks of the same sessions
 * are followed by six weeks of a different shape. Inside a block nothing moves:
 * that is what makes week 6 comparable to week 1.
 */

export type SplitSlot = {
  muscle: MuscleGroup;
  pattern: MovementPattern;
  /** Compounds lead a session and get the heavier rep range. */
  role: "accessory" | "compound";
};

export type SplitSession = {
  label: string;
  slots: SplitSlot[];
};

export type TrainingSplit = {
  gymDays: number;
  id: string;
  name: string;
  sessions: SplitSession[];
};

const compound = (
  muscle: MuscleGroup,
  pattern: MovementPattern,
): SplitSlot => ({ muscle, pattern, role: "compound" });

const accessory = (
  muscle: MuscleGroup,
  pattern: MovementPattern,
): SplitSlot => ({ muscle, pattern, role: "accessory" });

const fullBodyA: SplitSession = {
  label: "Full body A",
  slots: [
    compound("quads", "squat"),
    compound("chest", "horizontal-push"),
    compound("back", "horizontal-pull"),
    compound("hamstrings", "hinge"),
    compound("shoulders", "vertical-push"),
    accessory("glutes", "hinge"),
    accessory("biceps", "isolation"),
    accessory("triceps", "isolation"),
    accessory("calves", "isolation"),
    accessory("core", "core"),
  ],
};

const fullBodyB: SplitSession = {
  label: "Full body B",
  slots: [
    compound("hamstrings", "hinge"),
    compound("back", "vertical-pull"),
    compound("chest", "horizontal-push"),
    compound("quads", "lunge"),
    compound("shoulders", "vertical-push"),
    accessory("glutes", "hinge"),
    accessory("biceps", "isolation"),
    accessory("triceps", "isolation"),
    accessory("calves", "isolation"),
    accessory("core", "core"),
  ],
};

export const TRAINING_SPLITS: TrainingSplit[] = [
  {
    gymDays: 2,
    id: "full_body_2",
    name: "Full body",
    sessions: [fullBodyA, fullBodyB],
  },
  {
    gymDays: 2,
    id: "full_body_2_mirror",
    name: "Full body, mirrored",
    sessions: [fullBodyB, fullBodyA],
  },
  {
    gymDays: 3,
    id: "full_body_3",
    name: "Full body",
    sessions: [
      {
        label: "Full body A",
        slots: [
          compound("quads", "squat"),
          compound("chest", "horizontal-push"),
          compound("back", "horizontal-pull"),
          compound("shoulders", "vertical-push"),
          accessory("triceps", "isolation"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Full body B",
        slots: [
          compound("hamstrings", "hinge"),
          compound("back", "vertical-pull"),
          compound("chest", "horizontal-push"),
          compound("glutes", "hinge"),
          accessory("biceps", "isolation"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Full body C",
        slots: [
          compound("quads", "lunge"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          compound("shoulders", "vertical-push"),
          accessory("biceps", "isolation"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
    ],
  },
  {
    gymDays: 3,
    id: "full_body_3_unilateral",
    name: "Full body, single-leg lead",
    sessions: [
      {
        label: "Full body A",
        slots: [
          compound("hamstrings", "hinge"),
          compound("shoulders", "vertical-push"),
          compound("back", "vertical-pull"),
          compound("chest", "horizontal-push"),
          accessory("biceps", "isolation"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Full body B",
        slots: [
          compound("quads", "squat"),
          compound("back", "horizontal-pull"),
          compound("chest", "horizontal-push"),
          compound("glutes", "hinge"),
          accessory("triceps", "isolation"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Full body C",
        slots: [
          compound("quads", "lunge"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          compound("shoulders", "vertical-push"),
          accessory("biceps", "isolation"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
    ],
  },
  {
    gymDays: 4,
    id: "upper_lower_4",
    name: "Upper / lower",
    sessions: [
      {
        label: "Upper A",
        slots: [
          compound("chest", "horizontal-push"),
          compound("back", "horizontal-pull"),
          compound("shoulders", "vertical-push"),
          accessory("triceps", "isolation"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Lower A",
        slots: [
          compound("quads", "squat"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Upper B",
        slots: [
          compound("back", "vertical-pull"),
          compound("chest", "horizontal-push"),
          compound("shoulders", "vertical-push"),
          accessory("biceps", "isolation"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Lower B",
        slots: [
          compound("hamstrings", "hinge"),
          compound("quads", "lunge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
    ],
  },
  {
    gymDays: 4,
    id: "upper_lower_4_vertical",
    name: "Upper / lower, vertical lead",
    sessions: [
      {
        label: "Upper A",
        slots: [
          compound("shoulders", "vertical-push"),
          compound("back", "vertical-pull"),
          compound("chest", "horizontal-push"),
          accessory("biceps", "isolation"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Lower A",
        slots: [
          compound("hamstrings", "hinge"),
          compound("quads", "lunge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Upper B",
        slots: [
          compound("chest", "horizontal-push"),
          compound("back", "horizontal-pull"),
          compound("shoulders", "vertical-push"),
          accessory("triceps", "isolation"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Lower B",
        slots: [
          compound("quads", "squat"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
    ],
  },
  {
    gymDays: 5,
    id: "upper_lower_ppl_5",
    name: "Upper / lower / push / pull / legs",
    sessions: [
      {
        label: "Upper",
        slots: [
          compound("chest", "horizontal-push"),
          compound("back", "horizontal-pull"),
          compound("shoulders", "vertical-push"),
          accessory("biceps", "isolation"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Lower",
        slots: [
          compound("quads", "squat"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Push",
        slots: [
          compound("chest", "horizontal-push"),
          compound("shoulders", "vertical-push"),
          accessory("triceps", "isolation"),
        ],
      },
      {
        label: "Pull",
        slots: [
          compound("back", "vertical-pull"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Legs",
        slots: [
          compound("quads", "lunge"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
    ],
  },
  {
    gymDays: 5,
    id: "ppl_upper_lower_5",
    name: "Push / pull / legs / upper / lower",
    sessions: [
      {
        label: "Push",
        slots: [
          compound("chest", "horizontal-push"),
          compound("shoulders", "vertical-push"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Pull",
        slots: [
          compound("back", "vertical-pull"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Legs",
        slots: [
          compound("quads", "squat"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
        ],
      },
      {
        label: "Upper",
        slots: [
          compound("chest", "horizontal-push"),
          compound("back", "horizontal-pull"),
          compound("shoulders", "vertical-push"),
          accessory("biceps", "isolation"),
          accessory("triceps", "isolation"),
        ],
      },
      {
        label: "Lower",
        slots: [
          compound("quads", "lunge"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
          accessory("core", "core"),
        ],
      },
    ],
  },
  {
    gymDays: 6,
    id: "ppl_6",
    name: "Push / pull / legs, twice",
    sessions: [
      {
        label: "Push A",
        slots: [
          compound("chest", "horizontal-push"),
          compound("shoulders", "vertical-push"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Pull A",
        slots: [
          compound("back", "vertical-pull"),
          accessory("shoulders", "isolation"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Legs A",
        slots: [
          compound("quads", "squat"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
        ],
      },
      {
        label: "Push B",
        slots: [
          compound("shoulders", "vertical-push"),
          compound("chest", "horizontal-push"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Pull B",
        slots: [
          compound("back", "horizontal-pull"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Legs B",
        slots: [
          compound("quads", "lunge"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
        ],
      },
    ],
  },
  {
    gymDays: 6,
    id: "ppl_6_arms",
    name: "Push / pull / legs, arm bias",
    sessions: [
      {
        label: "Push A",
        slots: [
          compound("chest", "horizontal-push"),
          compound("shoulders", "vertical-push"),
          accessory("triceps", "isolation"),
          accessory("triceps", "isolation"),
        ],
      },
      {
        label: "Pull A",
        slots: [
          compound("back", "horizontal-pull"),
          accessory("biceps", "isolation"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Legs A",
        slots: [
          compound("hamstrings", "hinge"),
          compound("quads", "squat"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
        ],
      },
      {
        label: "Push B",
        slots: [
          compound("shoulders", "vertical-push"),
          compound("chest", "horizontal-push"),
          accessory("triceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Pull B",
        slots: [
          compound("back", "vertical-pull"),
          accessory("shoulders", "isolation"),
          accessory("biceps", "isolation"),
          accessory("core", "core"),
        ],
      },
      {
        label: "Legs B",
        slots: [
          compound("quads", "lunge"),
          compound("hamstrings", "hinge"),
          compound("glutes", "hinge"),
          accessory("calves", "isolation"),
        ],
      },
    ],
  },
];

/**
 * Which split a block trains. Two shapes per day count, alternating, so the
 * block after this one is not the block before it.
 */
export function getSplitForBlock(gymDays: number, blockIndex: number) {
  const options = TRAINING_SPLITS.filter((split) => split.gymDays === gymDays);
  if (options.length === 0) return null;
  return options[(Math.max(1, blockIndex) - 1) % options.length];
}

export function getSplit(id: string) {
  return TRAINING_SPLITS.find((split) => split.id === id) ?? null;
}
