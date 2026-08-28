/**
 * What Orbit asks of a new account, and what it celebrates once the account is
 * running. Both are derived from data the dashboard already loads: there is no
 * progression state to store, and therefore none to drift.
 */

import { ORBIT_DAY_SCORE, orbitTiers } from "@/lib/momentum";

export type SetupStep = {
  detail: string;
  done: boolean;
  href: string;
  id: "tasks" | "fitness" | "habits" | "orbit-day";
  label: string;
};

export type SetupState = {
  complete: boolean;
  done: number;
  percent: number;
  next: SetupStep | null;
  steps: SetupStep[];
};

export function getSetupState({
  fitnessConfigured,
  habitCount,
  hasOrbitDay,
  taskCount,
}: {
  fitnessConfigured: boolean;
  habitCount: number;
  hasOrbitDay: boolean;
  taskCount: number;
}): SetupState {
  const steps: SetupStep[] = [
    {
      detail: "Something you actually intend to do today.",
      done: taskCount > 0,
      href: "/tasks#new-task",
      id: "tasks",
      label: "Add your first task",
    },
    {
      detail: "One reusable week. You can change it any time.",
      done: fitnessConfigured,
      href: "/fitness",
      id: "fitness",
      label: "Set your training week",
    },
    {
      // The third pillar is the only one Orbit cannot guess: tasks are work
      // and training is the body, and whatever else this person means to keep
      // doing has to be named by them.
      detail: "One thing you mean to keep doing, and the days you want it.",
      done: habitCount > 0,
      href: "/habits",
      id: "habits",
      label: "Name a habit of your own",
    },
    {
      detail: `Finish a day at ${ORBIT_DAY_SCORE}% or better and the climb starts.`,
      done: hasOrbitDay,
      href: "/",
      id: "orbit-day",
      label: "Reach your first day in orbit",
    },
  ];
  const done = steps.filter((step) => step.done).length;

  return {
    complete: done === steps.length,
    done,
    next: steps.find((step) => !step.done) ?? null,
    percent: Math.round((done / steps.length) * 100),
    steps,
  };
}

export type Milestone = {
  achieved: boolean;
  detail: string;
  id: string;
  label: string;
  /** 0 to 1 — how far along an unachieved milestone is. */
  progress: number;
};

/** Run lengths worth marking. Chosen to be reachable, then hard, then rare. */
const runMilestones = [3, 7, 14, 30, 90];

export function getMilestones({
  bestAltitude,
  bestDay,
  bestStreak,
  orbitDays,
}: {
  bestAltitude: number;
  bestDay: number;
  bestStreak: number;
  orbitDays: number;
}): Milestone[] {
  const milestones: Milestone[] = [];

  const nextRun =
    runMilestones.find((length) => bestStreak < length) ?? runMilestones.at(-1)!;
  for (const length of runMilestones) {
    const achieved = bestStreak >= length;
    if (!achieved && length !== nextRun) continue;
    milestones.push({
      achieved,
      detail: achieved
        ? `${length} days in orbit, back to back.`
        : `${length - bestStreak} more days in a row.`,
      id: `run-${length}`,
      label: `${length}-day run`,
      progress: Math.min(1, bestStreak / length),
    });
  }

  for (const tier of orbitTiers.slice(1)) {
    const achieved = bestAltitude >= tier.floor;
    const nextTier = orbitTiers.find((item) => bestAltitude < item.floor);
    if (!achieved && nextTier?.id !== tier.id) continue;
    milestones.push({
      achieved,
      detail: achieved
        ? `You have held ${tier.name.toLowerCase()}.`
        : `${tier.floor - bestAltitude} altitude to go.`,
      id: `tier-${tier.id}`,
      label: tier.name,
      progress: Math.min(1, tier.floor ? bestAltitude / tier.floor : 1),
    });
  }

  milestones.push({
    achieved: bestDay >= 100,
    detail:
      bestDay >= 100
        ? "You have finished a day at 100%."
        : `Best day so far is ${bestDay}%.`,
    id: "perfect-day",
    label: "A perfect day",
    progress: Math.min(1, bestDay / 100),
  });

  milestones.push({
    achieved: orbitDays >= 20,
    detail:
      orbitDays >= 20
        ? `${orbitDays} days in orbit in this window.`
        : `${20 - orbitDays} more days in orbit.`,
    id: "twenty-days",
    label: "Twenty days in orbit",
    progress: Math.min(1, orbitDays / 20),
  });

  return milestones;
}

export function getEarnedToday({
  ringsClosed,
  ringsTotal,
  todayScore,
}: {
  ringsClosed: number;
  ringsTotal: number;
  todayScore: number | null;
}) {
  const allClosed = ringsTotal > 0 && ringsClosed === ringsTotal;
  const inOrbit = (todayScore ?? 0) >= ORBIT_DAY_SCORE;

  return {
    allClosed,
    headline: allClosed
      ? "Every stage done."
      : inOrbit
        ? "Today already counts."
        : null,
    inOrbit,
  };
}

export type RingProgress = {
  completed: number;
  percent: number;
  total: number;
};

export type ClosingLine = {
  remaining: number;
  system: "tasks" | "fitness" | "habits";
  text: string;
};

const systemNoun: Record<ClosingLine["system"], [string, string]> = {
  fitness: ["session", "sessions"],
  habits: ["habit", "habits"],
  tasks: ["task", "tasks"],
};

/**
 * How close each open stage is to done, nearest first. Naming the last mile is
 * what makes it worth walking — "one task" moves people, "72%" does not.
 */
export function getClosingLines(rings: {
  fitness: RingProgress;
  habits?: RingProgress;
  tasks: RingProgress;
}): ClosingLine[] {
  const entries = Object.entries(rings).filter(
    (entry): entry is [ClosingLine["system"], RingProgress] => Boolean(entry[1]),
  );

  return entries
    .filter(([, ring]) => ring.total > 0 && ring.percent < 100)
    .map(([system, ring]) => {
      const remaining = Math.max(0, ring.total - ring.completed);
      const [one, many] = systemNoun[system];
      return {
        remaining,
        system,
        text:
          remaining === 1
            ? `One ${one} from clearing ${system}.`
            : `${remaining} ${many} from clearing ${system}.`,
      };
    })
    .sort((a, b) => a.remaining - b.remaining);
}
