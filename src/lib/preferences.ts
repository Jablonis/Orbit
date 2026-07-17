import type { SupabaseClient } from "@supabase/supabase-js";

export const dashboardCardIds = [
  "rings",
  "fitness",
  "finance",
  "tasks",
  "analytics",
  "review",
] as const;

export const dashboardCardLabels: Record<DashboardCardId, string> = {
  analytics: "Analytics",
  finance: "Finance summary",
  fitness: "Fitness today",
  review: "Weekly review",
  rings: "Daily rings",
  tasks: "Quick tasks",
};

export type DashboardCardId = (typeof dashboardCardIds)[number];
export type DashboardDensity = "compact" | "comfortable";
export type DashboardRangeDays = 7 | 30;
export type PinnedFinanceMetric =
  | "balance"
  | "expenses"
  | "income"
  | "net";

export type DashboardPreferences = {
  cardOrder: DashboardCardId[];
  density: DashboardDensity;
  hiddenCards: DashboardCardId[];
  pinnedFinanceMetric: PinnedFinanceMetric;
  pinnedTaskCategory: string;
  rangeDays: DashboardRangeDays;
};

export const defaultDashboardPreferences: DashboardPreferences = {
  cardOrder: [...dashboardCardIds],
  density: "comfortable",
  hiddenCards: [],
  pinnedFinanceMetric: "balance",
  pinnedTaskCategory: "",
  rangeDays: 7,
};

const financeMetrics: PinnedFinanceMetric[] = [
  "balance",
  "income",
  "expenses",
  "net",
];

function isCardId(value: unknown): value is DashboardCardId {
  return dashboardCardIds.includes(value as DashboardCardId);
}

function normalizeCardOrder(value: unknown) {
  const requested = Array.isArray(value) ? value.filter(isCardId) : [];
  return [
    ...new Set([...requested, ...dashboardCardIds]),
  ] as DashboardCardId[];
}

export function parseDashboardPreferences(
  value: unknown,
): DashboardPreferences {
  const record = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};

  return {
    cardOrder: normalizeCardOrder(record.cardOrder),
    density: record.density === "compact" ? "compact" : "comfortable",
    hiddenCards: Array.isArray(record.hiddenCards)
      ? [...new Set(record.hiddenCards.filter(isCardId))]
      : [],
    pinnedFinanceMetric: financeMetrics.includes(
      record.pinnedFinanceMetric as PinnedFinanceMetric,
    )
      ? (record.pinnedFinanceMetric as PinnedFinanceMetric)
      : "balance",
    pinnedTaskCategory:
      typeof record.pinnedTaskCategory === "string"
        ? record.pinnedTaskCategory.trim().slice(0, 80)
        : "",
    rangeDays: record.rangeDays === 30 ? 30 : 7,
  };
}

export async function getDashboardPreferences(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("dashboard_preferences")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return parseDashboardPreferences(data?.dashboard_preferences);
}
