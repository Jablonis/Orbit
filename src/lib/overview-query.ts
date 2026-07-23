export type OverviewBriefMode = "daily" | "weekly";
export type OverviewTaskFilter = "today" | "overdue" | "upcoming";

export type OverviewQueryState = {
  brief: OverviewBriefMode;
  domains?: string;
  tasks: OverviewTaskFilter;
};

export function getOverviewHref(
  current: OverviewQueryState,
  update: Partial<OverviewQueryState>,
) {
  const next = { ...current, ...update };
  const query = new URLSearchParams();

  query.set("brief", next.brief);
  query.set("tasks", next.tasks);
  if (next.domains) query.set("domains", next.domains);

  return `/?${query.toString()}`;
}
