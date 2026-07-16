import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { getFinanceSummary, getFinanceTransactions } from "@/lib/finance";
import { FinanceClient } from "./FinanceClient";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const { supabase, user } = await getAuthenticatedUser();
  const transactions = await getFinanceTransactions(supabase, user.id);
  const summary = getFinanceSummary(transactions);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0d0e] pb-12 text-[#e5e2e1] md:pl-[112px]">
      <AppNavigation active="finance" />
      <FinanceClient summary={summary} transactions={transactions} />
    </main>
  );
}
