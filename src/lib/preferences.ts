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

export type ProductivityScoringPreferences = {
  focusTargetMinutes: number;
  weights: {
    fitness: number;
    focus: number;
    tasks: number;
  };
};

export type RegionalPreferences = {
  currency: "CZK" | "EUR" | "GBP" | "USD";
  displayName: string;
  initials: string;
  locale: "en-GB" | "en-IE" | "en-US" | "sk-SK";
  timeZone:
    | "America/Los_Angeles"
    | "America/New_York"
    | "Europe/Bratislava"
    | "Europe/London"
    | "UTC";
  weekStartsOn: "monday" | "sunday";
};

export type DashboardPreferences = {
  cardOrder: DashboardCardId[];
  density: DashboardDensity;
  hiddenCards: DashboardCardId[];
  pinnedFinanceMetric: PinnedFinanceMetric;
  pinnedTaskCategory: string;
  rangeDays: DashboardRangeDays;
  regional: RegionalPreferences;
  scoring: ProductivityScoringPreferences;
};

export const defaultProductivityScoring: ProductivityScoringPreferences = {
  focusTargetMinutes: 120,
  weights: {
    fitness: 25,
    focus: 15,
    tasks: 60,
  },
};

export const defaultDashboardPreferences: DashboardPreferences = {
  cardOrder: [...dashboardCardIds],
  density: "comfortable",
  hiddenCards: [],
  pinnedFinanceMetric: "balance",
  pinnedTaskCategory: "",
  rangeDays: 7,
  regional: {
    currency: "EUR",
    displayName: "",
    initials: "",
    locale: "en-IE",
    timeZone: "Europe/Bratislava",
    weekStartsOn: "monday",
  },
  scoring: defaultProductivityScoring,
};

const financeMetrics: PinnedFinanceMetric[] = [
  "balance",
  "income",
  "expenses",
  "net",
];
const currencies: RegionalPreferences["currency"][] = ["CZK", "EUR", "GBP", "USD"];
const locales: RegionalPreferences["locale"][] = ["en-GB", "en-IE", "en-US", "sk-SK"];
const timeZones: RegionalPreferences["timeZone"][] = [
  "America/Los_Angeles",
  "America/New_York",
  "Europe/Bratislava",
  "Europe/London",
  "UTC",
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

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const number = Number(value);
  return Number.isInteger(number)
    ? Math.min(maximum, Math.max(minimum, number))
    : fallback;
}

export function parseDashboardPreferences(
  value: unknown,
): DashboardPreferences {
  const record = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const scoring =
    record.scoring && typeof record.scoring === "object"
      ? (record.scoring as Record<string, unknown>)
      : {};
  const weights =
    scoring.weights && typeof scoring.weights === "object"
      ? (scoring.weights as Record<string, unknown>)
      : {};
  const regional =
    record.regional && typeof record.regional === "object"
      ? (record.regional as Record<string, unknown>)
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
    regional: {
      currency: currencies.includes(regional.currency as RegionalPreferences["currency"])
        ? (regional.currency as RegionalPreferences["currency"])
        : defaultDashboardPreferences.regional.currency,
      displayName:
        typeof regional.displayName === "string"
          ? regional.displayName.trim().slice(0, 80)
          : "",
      initials:
        typeof regional.initials === "string"
          ? regional.initials.trim().toLocaleUpperCase().slice(0, 3)
          : "",
      locale: locales.includes(regional.locale as RegionalPreferences["locale"])
        ? (regional.locale as RegionalPreferences["locale"])
        : defaultDashboardPreferences.regional.locale,
      timeZone: timeZones.includes(regional.timeZone as RegionalPreferences["timeZone"])
        ? (regional.timeZone as RegionalPreferences["timeZone"])
        : defaultDashboardPreferences.regional.timeZone,
      weekStartsOn: regional.weekStartsOn === "sunday" ? "sunday" : "monday",
    },
    scoring: {
      focusTargetMinutes: boundedInteger(
        scoring.focusTargetMinutes,
        defaultProductivityScoring.focusTargetMinutes,
        15,
        480,
      ),
      weights: {
        fitness: boundedInteger(
          weights.fitness,
          defaultProductivityScoring.weights.fitness,
          0,
          100,
        ),
        focus: boundedInteger(
          weights.focus,
          defaultProductivityScoring.weights.focus,
          0,
          100,
        ),
        tasks: boundedInteger(
          weights.tasks,
          defaultProductivityScoring.weights.tasks,
          0,
          100,
        ),
      },
    },
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
