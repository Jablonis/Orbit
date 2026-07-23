export type ProductivityPoint = {
  completedFitness: number;
  completedTasks: number;
  date: string;
  focusMinutes: number;
  future: boolean;
  label: string;
  plannedFitness: number;
  plannedTasks: number;
  score: number | null;
};

export type ProductivityDomain = "tasks" | "fitness" | "focus";

export type ProductivityScoring = {
  focusTargetMinutes: number;
  weights: Record<ProductivityDomain, number>;
};

const defaultScoring: ProductivityScoring = {
  focusTargetMinutes: 120,
  weights: {
    fitness: 25,
    focus: 15,
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

export function rescoreProductivity(
  productivity: {
    current: ProductivityPoint[];
    previous: ProductivityPoint[];
  },
  enabledDomains: ProductivityDomain[],
  scoring: ProductivityScoring = defaultScoring,
) {
  const rescore = (point: ProductivityPoint): ProductivityPoint => {
    if (point.future) return { ...point, score: null };
    const availableDomains = enabledDomains.filter((domain) => {
      if (domain === "tasks") return point.plannedTasks > 0;
      if (domain === "fitness") return point.plannedFitness > 0;
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
      tasks: point.plannedTasks
        ? Math.min(1, point.completedTasks / point.plannedTasks)
        : 0,
    };
    const weighted = availableDomains.reduce(
      (total, domain) => total + ratios[domain] * scoring.weights[domain],
      0,
    );
    return {
      ...point,
      score: availableWeight
        ? Math.round((weighted / availableWeight) * 100)
        : null,
    };
  };

  return {
    current: productivity.current.map(rescore),
    previous: productivity.previous.map(rescore),
  };
}
