import type { PinnedFinanceMetric } from "@/lib/preferences";
import type { getFinanceSummary } from "@/lib/finance";

export function getPinnedFinanceMetric(
  metric: PinnedFinanceMetric,
  finance: ReturnType<typeof getFinanceSummary>,
) {
  if (metric === "income") {
    return {
      detail: "Paid income in the current summary period.",
      label: "Pinned income",
      value: finance.income,
    };
  }
  if (metric === "expenses") {
    return {
      detail: "Paid expenses in the current summary period.",
      label: "Pinned expenses",
      value: finance.expenses,
    };
  }
  if (metric === "net") {
    return {
      detail: "Income minus paid expenses.",
      label: "Pinned net cashflow",
      value: finance.netCashflow,
    };
  }
  return {
    detail: "Income minus expenses across all imported paid transactions.",
    label: "Imported net cashflow",
    value: finance.availableBalance,
  };
}
