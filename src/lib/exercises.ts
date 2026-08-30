import type { FitnessEquipment } from "@/lib/fitness-setup";

/**
 * The exercise library.
 *
 * A TypeScript constant rather than a database table, for the same reasons
 * `routine-kit.ts` is one: it is shared reference data, not anyone's data. In
 * code it is versioned with the app, testable, needs no seed migration, and
 * asks no questions about row-level security. Logged sets store the id as
 * text, so the library can grow or be reworded without rewriting anyone's
 * history — the one thing it must never do.
 *
 * Deliberately ordinary. This is the set of lifts a gym actually contains, not
 * a catalogue: the first entry for a slot is the one most gyms have and most
 * people already know how to do, and generation walks the list in order.
 */

/**
 * The ten groups a week is measured against. Forearms, traps and the rest are
 * folded into the movements that train them — a list you cannot honestly count
 * to two on is a list that makes the rule meaningless.
 */
export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** What the body is doing, which is what makes two exercises interchangeable. */
export const MOVEMENT_PATTERNS = [
  "horizontal-push",
  "vertical-push",
  "horizontal-pull",
  "vertical-pull",
  "squat",
  "hinge",
  "lunge",
  "isolation",
  "core",
] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export type Exercise = {
  /** Stable for ever: logged sets refer to it. Renaming the name is free. */
  id: string;
  /** Any one of these is enough to do it. */
  equipment: FitnessEquipment[];
  isCompound: boolean;
  name: string;
  pattern: MovementPattern;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
};

export const EXERCISES: Exercise[] = [
  // ---------------------------------------------------------------- chest --
  {
    equipment: ["full_gym"],
    id: "barbell-bench-press",
    isCompound: true,
    name: "Barbell bench press",
    pattern: "horizontal-push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
  },
  {
    equipment: ["dumbbells", "full_gym"],
    id: "incline-dumbbell-press",
    isCompound: true,
    name: "Incline dumbbell press",
    pattern: "horizontal-push",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders", "triceps"],
  },
  {
    equipment: ["dumbbells", "full_gym"],
    id: "dumbbell-bench-press",
    isCompound: true,
    name: "Dumbbell bench press",
    pattern: "horizontal-push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
  },
  {
    equipment: ["full_gym"],
    id: "machine-chest-press",
    isCompound: true,
    name: "Machine chest press",
    pattern: "horizontal-push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders"],
  },
  {
    equipment: ["bodyweight", "bands", "dumbbells", "full_gym"],
    id: "push-up",
    isCompound: true,
    name: "Push-up",
    pattern: "horizontal-push",
    primaryMuscle: "chest",
    secondaryMuscles: ["triceps", "shoulders", "core"],
  },
  {
    equipment: ["full_gym", "bands"],
    id: "cable-fly",
    isCompound: false,
    name: "Cable fly",
    pattern: "isolation",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders"],
  },

  // ----------------------------------------------------------------- back --
  {
    equipment: ["full_gym"],
    id: "barbell-row",
    isCompound: true,
    name: "Barbell row",
    pattern: "horizontal-pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "hamstrings"],
  },
  {
    equipment: ["dumbbells", "full_gym"],
    id: "dumbbell-row",
    isCompound: true,
    name: "Dumbbell row",
    pattern: "horizontal-pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "core"],
  },
  {
    equipment: ["full_gym", "bands"],
    id: "seated-cable-row",
    isCompound: true,
    name: "Seated cable row",
    pattern: "horizontal-pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
  },
  {
    equipment: ["full_gym", "bands"],
    id: "lat-pulldown",
    isCompound: true,
    name: "Lat pulldown",
    pattern: "vertical-pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
  },
  {
    equipment: ["bodyweight", "full_gym"],
    id: "pull-up",
    isCompound: true,
    name: "Pull-up",
    pattern: "vertical-pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps", "core"],
  },
  {
    equipment: ["bodyweight", "full_gym"],
    id: "chin-up",
    isCompound: true,
    name: "Chin-up",
    pattern: "vertical-pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
  },
  {
    equipment: ["full_gym", "bands", "dumbbells"],
    id: "face-pull",
    isCompound: false,
    name: "Face pull",
    pattern: "isolation",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["back"],
  },

  // ------------------------------------------------------------ shoulders --
  {
    equipment: ["full_gym"],
    id: "overhead-press",
    isCompound: true,
    name: "Overhead press",
    pattern: "vertical-push",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps", "core"],
  },
  {
    equipment: ["dumbbells", "full_gym"],
    id: "dumbbell-shoulder-press",
    isCompound: true,
    name: "Dumbbell shoulder press",
    pattern: "vertical-push",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps"],
  },
  {
    equipment: ["dumbbells", "bands", "full_gym"],
    id: "lateral-raise",
    isCompound: false,
    name: "Lateral raise",
    pattern: "isolation",
    primaryMuscle: "shoulders",
    secondaryMuscles: [],
  },
  {
    equipment: ["dumbbells", "bands", "full_gym"],
    id: "rear-delt-fly",
    isCompound: false,
    name: "Rear delt fly",
    pattern: "isolation",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["back"],
  },

  // --------------------------------------------------------------- biceps --
  {
    equipment: ["full_gym"],
    id: "barbell-curl",
    isCompound: false,
    name: "Barbell curl",
    pattern: "isolation",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
  },
  {
    equipment: ["dumbbells", "full_gym"],
    id: "dumbbell-curl",
    isCompound: false,
    name: "Dumbbell curl",
    pattern: "isolation",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
  },
  {
    equipment: ["dumbbells", "full_gym"],
    id: "hammer-curl",
    isCompound: false,
    name: "Hammer curl",
    pattern: "isolation",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
  },
  {
    equipment: ["bands", "full_gym"],
    id: "cable-curl",
    isCompound: false,
    name: "Cable curl",
    pattern: "isolation",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
  },

  // -------------------------------------------------------------- triceps --
  {
    equipment: ["full_gym", "bands"],
    id: "triceps-pushdown",
    isCompound: false,
    name: "Triceps pushdown",
    pattern: "isolation",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
  },
  {
    equipment: ["dumbbells", "bands", "full_gym"],
    id: "overhead-triceps-extension",
    isCompound: false,
    name: "Overhead triceps extension",
    pattern: "isolation",
    primaryMuscle: "triceps",
    secondaryMuscles: [],
  },
  {
    equipment: ["full_gym"],
    id: "close-grip-bench-press",
    isCompound: true,
    name: "Close-grip bench press",
    pattern: "horizontal-push",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "shoulders"],
  },
  {
    equipment: ["bodyweight", "full_gym"],
    id: "dips",
    isCompound: true,
    name: "Dips",
    pattern: "vertical-push",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "shoulders"],
  },

  // ---------------------------------------------------------------- quads --
  {
    equipment: ["full_gym"],
    id: "back-squat",
    isCompound: true,
    name: "Back squat",
    pattern: "squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "core"],
  },
  {
    equipment: ["full_gym"],
    id: "front-squat",
    isCompound: true,
    name: "Front squat",
    pattern: "squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "core"],
  },
  {
    equipment: ["full_gym"],
    id: "leg-press",
    isCompound: true,
    name: "Leg press",
    pattern: "squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes"],
  },
  {
    equipment: ["dumbbells", "bodyweight", "full_gym"],
    id: "goblet-squat",
    isCompound: true,
    name: "Goblet squat",
    pattern: "squat",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "core"],
  },
  {
    equipment: ["dumbbells", "bodyweight", "full_gym"],
    id: "bulgarian-split-squat",
    isCompound: true,
    name: "Bulgarian split squat",
    pattern: "lunge",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
  },
  {
    equipment: ["dumbbells", "bodyweight", "full_gym"],
    id: "walking-lunge",
    isCompound: true,
    name: "Walking lunge",
    pattern: "lunge",
    primaryMuscle: "quads",
    secondaryMuscles: ["glutes", "hamstrings"],
  },
  {
    equipment: ["full_gym"],
    id: "leg-extension",
    isCompound: false,
    name: "Leg extension",
    pattern: "isolation",
    primaryMuscle: "quads",
    secondaryMuscles: [],
  },

  // ----------------------------------------------------------- hamstrings --
  {
    equipment: ["full_gym"],
    id: "deadlift",
    isCompound: true,
    name: "Deadlift",
    pattern: "hinge",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["back", "glutes", "core"],
  },
  {
    equipment: ["dumbbells", "full_gym"],
    id: "romanian-deadlift",
    isCompound: true,
    name: "Romanian deadlift",
    pattern: "hinge",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "back"],
  },
  {
    equipment: ["full_gym"],
    id: "lying-leg-curl",
    isCompound: false,
    name: "Lying leg curl",
    pattern: "isolation",
    primaryMuscle: "hamstrings",
    secondaryMuscles: [],
  },
  {
    equipment: ["bodyweight", "bands"],
    id: "nordic-curl",
    isCompound: false,
    name: "Nordic curl",
    pattern: "isolation",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes"],
  },

  // --------------------------------------------------------------- glutes --
  {
    equipment: ["full_gym", "dumbbells"],
    id: "hip-thrust",
    isCompound: true,
    name: "Hip thrust",
    pattern: "hinge",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
  },
  {
    equipment: ["bodyweight", "bands"],
    id: "glute-bridge",
    isCompound: false,
    name: "Glute bridge",
    pattern: "hinge",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
  },
  {
    equipment: ["bands", "full_gym"],
    id: "cable-kickback",
    isCompound: false,
    name: "Cable kickback",
    pattern: "isolation",
    primaryMuscle: "glutes",
    secondaryMuscles: [],
  },

  // ---------------------------------------------------------------- calves --
  {
    equipment: ["bodyweight", "dumbbells", "full_gym"],
    id: "standing-calf-raise",
    isCompound: false,
    name: "Standing calf raise",
    pattern: "isolation",
    primaryMuscle: "calves",
    secondaryMuscles: [],
  },
  {
    equipment: ["full_gym"],
    id: "seated-calf-raise",
    isCompound: false,
    name: "Seated calf raise",
    pattern: "isolation",
    primaryMuscle: "calves",
    secondaryMuscles: [],
  },

  // ------------------------------------------------------------------ core --
  {
    equipment: ["bodyweight"],
    id: "plank",
    isCompound: false,
    name: "Plank",
    pattern: "core",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders"],
  },
  {
    equipment: ["bodyweight", "full_gym"],
    id: "hanging-leg-raise",
    isCompound: false,
    name: "Hanging leg raise",
    pattern: "core",
    primaryMuscle: "core",
    secondaryMuscles: [],
  },
  {
    equipment: ["bands", "full_gym"],
    id: "cable-crunch",
    isCompound: false,
    name: "Cable crunch",
    pattern: "core",
    primaryMuscle: "core",
    secondaryMuscles: [],
  },
  {
    equipment: ["bodyweight", "full_gym"],
    id: "ab-wheel",
    isCompound: false,
    name: "Ab wheel",
    pattern: "core",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders"],
  },
  {
    equipment: ["bodyweight", "dumbbells", "full_gym"],
    id: "farmer-carry",
    isCompound: true,
    name: "Farmer carry",
    pattern: "core",
    primaryMuscle: "core",
    secondaryMuscles: ["shoulders", "back"],
  },

  // ------------------------------------------ bodyweight and band fills --
  // Last in the list on purpose: a full gym reaches these only when the
  // earlier picks are taken, while an account with a floor and a bar still
  // finds something for every muscle group.
  {
    equipment: ["bodyweight"],
    id: "decline-push-up",
    isCompound: true,
    name: "Feet-elevated push-up",
    pattern: "horizontal-push",
    primaryMuscle: "chest",
    secondaryMuscles: ["shoulders", "triceps"],
  },
  {
    equipment: ["bodyweight", "full_gym"],
    id: "inverted-row",
    isCompound: true,
    name: "Inverted row",
    pattern: "horizontal-pull",
    primaryMuscle: "back",
    secondaryMuscles: ["biceps"],
  },
  {
    equipment: ["bands", "bodyweight"],
    id: "pike-push-up",
    isCompound: true,
    name: "Pike push-up",
    pattern: "vertical-push",
    primaryMuscle: "shoulders",
    secondaryMuscles: ["triceps"],
  },
  {
    equipment: ["bodyweight", "full_gym"],
    id: "inverted-curl",
    isCompound: false,
    name: "Inverted curl",
    pattern: "isolation",
    primaryMuscle: "biceps",
    secondaryMuscles: ["back"],
  },
  {
    equipment: ["bands"],
    id: "band-curl",
    isCompound: false,
    name: "Band curl",
    pattern: "isolation",
    primaryMuscle: "biceps",
    secondaryMuscles: [],
  },
  {
    equipment: ["bodyweight"],
    id: "diamond-push-up",
    isCompound: true,
    name: "Diamond push-up",
    pattern: "horizontal-push",
    primaryMuscle: "triceps",
    secondaryMuscles: ["chest", "shoulders"],
  },
  {
    equipment: ["bands", "bodyweight", "dumbbells", "full_gym"],
    id: "single-leg-romanian-deadlift",
    isCompound: true,
    name: "Single-leg Romanian deadlift",
    pattern: "hinge",
    primaryMuscle: "hamstrings",
    secondaryMuscles: ["glutes", "core"],
  },
  {
    equipment: ["bands", "bodyweight"],
    id: "single-leg-glute-bridge",
    isCompound: false,
    name: "Single-leg glute bridge",
    pattern: "hinge",
    primaryMuscle: "glutes",
    secondaryMuscles: ["hamstrings"],
  },
  {
    equipment: ["bodyweight"],
    id: "single-leg-calf-raise",
    isCompound: false,
    name: "Single-leg calf raise",
    pattern: "isolation",
    primaryMuscle: "calves",
    secondaryMuscles: [],
  },
];

const byId = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]));

/** The exercise, or null — a logged set for an id the library dropped must
 * render as an unknown name, never crash a page. */
export function getExercise(id: string): Exercise | null {
  return byId.get(id) ?? null;
}

/** Its name, or the raw id, so history stays readable whatever happens here. */
export function getExerciseName(id: string) {
  return byId.get(id)?.name ?? id;
}

/**
 * What a gym actually contains. A full gym has dumbbells and a floor; a floor
 * exists wherever you are. Without this, "full_gym" would filter out every
 * push-up in the library.
 */
export function expandEquipment(
  owned: FitnessEquipment[],
): Set<FitnessEquipment> {
  const available = new Set<FitnessEquipment>(owned);
  available.add("bodyweight");
  if (available.has("full_gym")) {
    available.add("bands");
    available.add("dumbbells");
  }
  return available;
}

/**
 * The avoid list is free text, and it is written by someone who types Slovak
 * without diacritics half the time. So: strip accents, split on the marks
 * people separate things with, and match against the English name plus the
 * words they would actually use for it.
 *
 * Deliberately not a joint model. "koleno" would have to drop every squat,
 * lunge and leg press to be honest about it, and quietly deleting leg day is
 * worse than matching nothing — what a term did match is always shown.
 */
const AVOID_SYNONYMS: Record<string, string[]> = {
  benc: ["bench press"],
  brucho: ["plank", "crunch", "leg raise", "ab wheel"],
  drep: ["squat"],
  klik: ["push-up"],
  kliky: ["push-up"],
  lytka: ["calf"],
  "mrtvy tah": ["deadlift"],
  vypady: ["lunge", "split squat"],
  zhyb: ["pull-up", "chin-up"],
  zhyby: ["pull-up", "chin-up"],
};

function normalizeTerm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** The terms worth matching on. Two letters match half the library, so three. */
export function parseAvoidList(text: string): string[] {
  return [
    ...new Set(
      normalizeTerm(text)
        .split(/[,;\n/]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3),
    ),
  ];
}

export function isAvoided(exercise: Exercise, terms: string[]) {
  const name = normalizeTerm(exercise.name);
  return terms.some((term) => {
    if (name.includes(term)) return true;
    const synonyms = AVOID_SYNONYMS[term];
    return synonyms ? synonyms.some((word) => name.includes(word)) : false;
  });
}
