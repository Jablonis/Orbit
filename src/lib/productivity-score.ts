export type ProductivityPoint = {
  completedFitness: number;
  completedHabits: number;
  completedTasks: number;
  date: string;
  focusMinutes: number;
  future: boolean;
  label: string;
  plannedFitness: number;
  plannedHabits: number;
  plannedTasks: number;
  score: number | null;
};

export type ProductivityDomain = "tasks" | "fitness" | "focus" | "habits";

export type ProductivityScoring = {
  focusTargetMinutes: number;
  weights: Record<ProductivityDomain, number>;
};

const defaultScoring: ProductivityScoring = {
  focusTargetMinutes: 120,
  weights: {
    fitness: 25,
    focus: 15,
    // A habit is a peer of a session, not a garnish on the task list: the day
    // you kept every one of them and did nothing else was still a day you kept
    // them. Weights are normalised over whatever the day actually asked for,
    // so an account with no habits scores exactly as it did before they
    // existed.
    habits: 25,
    tasks: 60,
  },
};

export function getProductivityChartPaths(
  points: ProductivityPoint[],
  chartX: (index: number) => number,
  chartY: (score: number) => number,
) {
  const segments: Array<Array<{ x: number; y: number }>> = [];
  let segment: Array<{ x: number; y: number }> = [];

  points.forEach((point, index) => {
    if (point.score === null) {
      if (segment.length > 0) segments.push(segment);
      segment = [];
      return;
    }
    segment.push({ x: chartX(index), y: chartY(point.score) });
  });
  if (segment.length > 0) segments.push(segment);

  return segments.map((items) => {
    if (items.length === 1) {
      return `M ${items[0].x} ${items[0].y} h 0.01`;
    }
    return items.slice(1).reduce((path, point, index) => {
      const previous = items[index];
      const midpoint = (previous.x + point.x) / 2;
      return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
    }, `M ${items[0].x} ${items[0].y}`);
  });
}

/**
 * One day's score, from the counts of that day. Exported because the reward a
 * task carries is the difference this function makes when that task is ticked
 * — the same arithmetic, asked twice, rather than a second scoring rule that
 * can drift from this one.
 */
export function scorePoint(
  point: ProductivityPoint,
  enabledDomains: ProductivityDomain[],
  scoring: ProductivityScoring = defaultScoring,
): number | null {
  if (point.future) return null;
  const availableDomains = enabledDomains.filter((domain) => {
    if (domain === "tasks") return point.plannedTasks > 0;
    if (domain === "fitness") return point.plannedFitness > 0;
    if (domain === "habits") return point.plannedHabits > 0;
    return scoring.focusTargetMinutes > 0;
  });
  const availableWeight = availableDomains.reduce(
    (total, domain) => total + scoring.weights[domain],
    0,
  );
  const ratios: Record<ProductivityDomain, number> = {
    fitness: point.plannedFitness
      ? Math.min(1, point.completedFitness / point.plannedFitness)
      : 0,
    focus: Math.min(1, point.focusMinutes / scoring.focusTargetMinutes),
    habits: point.plannedHabits
      ? Math.min(1, point.completedHabits / point.plannedHabits)
      : 0,
    tasks: point.plannedTasks
      ? Math.min(1, point.completedTasks / point.plannedTasks)
      : 0,
  };
  const weighted = availableDomains.reduce(
    (total, domain) => total + ratios[domain] * scoring.weights[domain],
    0,
  );
  return availableWeight ? Math.round((weighted / availableWeight) * 100) : null;
}

export function rescoreProductivity(
  productivity: {
    current: ProductivityPoint[];
    previous: ProductivityPoint[];
  },
  enabledDomains: ProductivityDomain[],
  scoring: ProductivityScoring = defaultScoring,
) {
  const rescore = (point: ProductivityPoint): ProductivityPoint => ({
    ...point,
    score: scorePoint(point, enabledDomains, scoring),
  });

  return {
    current: productivity.current.map(rescore),
    previous: productivity.previous.map(rescore),
  };
}
