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

export function rescoreProductivity(
  productivity: {
    current: ProductivityPoint[];
    previous: ProductivityPoint[];
  },
  enabledDomains: ProductivityDomain[],
) {
  const weights: Record<ProductivityDomain, number> = {
    fitness: 25,
    focus: 15,
    tasks: 60,
  };
  const enabledWeight = enabledDomains.reduce(
    (total, domain) => total + weights[domain],
    0,
  );
  const rescore = (point: ProductivityPoint): ProductivityPoint => {
    if (point.future) return { ...point, score: null };
    const ratios: Record<ProductivityDomain, number> = {
      fitness: point.plannedFitness ? point.completedFitness : 0,
      focus: Math.min(1, point.focusMinutes / 120),
      tasks: point.plannedTasks
        ? Math.min(1, point.completedTasks / point.plannedTasks)
        : 0,
    };
    const weighted = enabledDomains.reduce(
      (total, domain) => total + ratios[domain] * weights[domain],
      0,
    );
    return {
      ...point,
      score: enabledWeight ? Math.round((weighted / enabledWeight) * 100) : null,
    };
  };

  return {
    current: productivity.current.map(rescore),
    previous: productivity.previous.map(rescore),
  };
}
