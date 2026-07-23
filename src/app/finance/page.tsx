import type { Metadata } from "next";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getFinanceStatementImports,
  getFinanceSummary,
  getFinanceTransactions,
} from "@/lib/finance";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import { FinanceClient } from "./FinanceClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance",
};

export default async function FinancePage() {
  const { supabase, user } = await getAuthenticatedUser();
  const [transactions, statementImports, preferences] = await Promise.all([
    getFinanceTransactions(supabase, user.id),
    getFinanceStatementImports(supabase, user.id),
    getDashboardPreferences(supabase, user.id),
  ]);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const summary = getFinanceSummary(transactions, today.slice(0, 7));

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation active="finance" profile={preferences.regional} userEmail={user.email ?? "Orbit user"} />
      <FinanceClient
        regional={preferences.regional}
        statementImports={statementImports}
        summary={summary}
        transactions={transactions}
      />
    </main>
  );
}
