"use client";

import { useState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { BankStatementImporter } from "@/components/BankStatementImporter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import {
  type FinanceStatementImport,
  type FinanceTransaction,
  formatCurrency,
  transactionsToCsv,
} from "@/lib/finance";
import {
  clearFinanceDataAction,
  restoreFinanceDataAction,
} from "./actions";

const categoryColors = ["#60a5fa", "#a3e635", "#a78bfa", "#f59e0b", "#ff4fa3"];

export function FinanceClient({
  statementImports,
  summary,
  transactions,
}: {
  statementImports: FinanceStatementImport[];
  summary: ReturnType<typeof import("@/lib/finance").getFinanceSummary>;
  transactions: FinanceTransaction[];
}) {
  const [archivedAt, setArchivedAt] = useState<string | null>(null);
  const currentMonth = summary.monthlyCashflow.at(-1);
  const previousMonth = summary.monthlyCashflow.at(-2);
  const currentNet = currentMonth ? currentMonth.income - currentMonth.expense : 0;
  const previousNet = previousMonth ? previousMonth.income - previousMonth.expense : 0;
  const netChange = currentNet - previousNet;

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-5 pr-14 md:pr-0 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label-caps text-[#a3e635]">Finance system</p>
          <h1 className="page-title mt-2 text-white">
            Your money, at a glance
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#c4c7c8]">
            Secure monthly bank-statement imports with live, user-isolated summaries.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#202020]"
            onClick={() => download("orbit-finance-export.csv", transactionsToCsv(transactions))}
            type="button"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="content-panel relative min-h-[300px] overflow-hidden rounded-[var(--radius-panel)] p-6 xl:col-span-12">
          <p className="label-caps text-[#c4c7c8]">Available balance</p>
          <p className="metric-value relative mt-4 text-[46px] font-bold leading-[54px] text-white sm:text-[58px] sm:leading-[64px]">
            {formatCurrency(summary.availableBalance)}
          </p>
          <p className={`relative mt-3 text-[13px] font-semibold ${netChange >= 0 ? "text-[var(--accent-primary)]" : "text-[var(--danger)]"}`}>
            {previousMonth
              ? `${netChange >= 0 ? "+" : ""}${formatCurrency(netChange)} net change versus ${previousMonth.month}`
              : "Add another month of data to unlock period comparison."}
          </p>
          <dl className="relative mt-8 grid border-y border-[var(--border-subtle)] sm:grid-cols-3">
            <MiniStat label="Income" value={formatCurrency(summary.income)} />
            <MiniStat label="Expenses" value={formatCurrency(summary.expenses)} />
            <MiniStat label="Net" value={formatCurrency(summary.netCashflow)} />
          </dl>
        </article>

        <CashflowCard summary={summary} />
        <TransactionsCard transactions={summary.recentTransactions} />
        <CategoryCard summary={summary} />
        <StatementHistoryCard statementImports={statementImports} />
      </section>
      <section aria-labelledby="finance-utilities-title" className="mt-10">
        <p className="label-caps text-[var(--text-tertiary)]">Utilities</p>
        <h2 className="mt-1 text-[22px] font-semibold text-white" id="finance-utilities-title">Statement import and maintenance</h2>
        <div className="mt-4 grid gap-6 xl:grid-cols-12">
          <BankStatementImporter initialMonth={summary.currentMonth} />
          <MaintenanceCard onCleared={setArchivedAt} />
        </div>
      </section>
      {archivedAt ? (
        <ActionToast
          action={(
            <button
              className="min-h-11 shrink-0 px-2 font-bold text-[var(--accent-primary)]"
              onClick={async () => {
                const result = await restoreFinanceDataAction(archivedAt);
                if (result.ok) setArchivedAt(null);
              }}
              type="button"
            >
              Undo
            </button>
          )}
          message="Finance data archived."
        />
      ) : null}
    </section>
  );
}

function MaintenanceCard({
  onCleared,
}: {
  onCleared: (archivedAt: string) => void;
}) {
  return (
    <article className="content-panel rounded-[var(--radius-panel)] p-6 xl:col-span-5">
      <p className="label-caps text-[#c4c7c8]">Data maintenance</p>
      <h3 className="mt-2 text-[22px] font-semibold text-white">Manage finance history</h3>
      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">
        Export remains available above. Clearing archives your imported statements and transactions so they can be restored immediately.
      </p>
      <div className="mt-5">
        <ConfirmDialog
          confirmationPhrase="CLEAR FINANCE"
          confirmLabel="Clear all data"
          description="Every active finance transaction and statement summary will be archived. Your dashboard totals will reset, and you can undo immediately after clearing."
          onConfirm={async () => {
            const result = await clearFinanceDataAction();
            if (result.ok) onCleared(result.archivedAt);
            return result;
          }}
          title="Clear all finance data?"
          triggerClassName="rounded-[14px] border border-[#ff8a80]/20 bg-[#ff8a80]/10 px-4 py-2 text-[13px] font-semibold text-[#ffd7d3]"
          triggerLabel="Clear finance data"
        />
      </div>
    </article>
  );
}

function StatementHistoryCard({
  statementImports,
}: {
  statementImports: FinanceStatementImport[];
}) {
  return (
    <article className="content-panel rounded-[var(--radius-panel)] p-6 xl:col-span-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps text-[var(--text-secondary)]">Monthly statements</p>
          <h2 className="mt-2 text-[24px] font-semibold text-white">Import history</h2>
        </div>
        <span className="metric-value text-[11px] font-semibold text-[var(--text-secondary)]">
          {statementImports.length} saved
        </span>
      </div>
      {statementImports.length > 0 ? (
        <div className="mt-5 border-y border-[var(--border-subtle)]">
          {statementImports.slice(0, 6).map((statement) => (
            <div className="grid gap-4 border-b border-[var(--border-subtle)] py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center" key={statement.id}>
              <div className="flex items-start justify-between gap-3 sm:block">
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {formatStatementMonth(statement.statementMonth)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                    {statement.transactionCount} transactions · {statement.currency}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Income <span className="metric-value block pt-1 font-semibold text-white">{formatCurrency(statement.income)}</span></p>
              <p className="text-[11px] text-[var(--text-tertiary)]">Expenses <span className="metric-value block pt-1 font-semibold text-white">{formatCurrency(statement.expenses)}</span></p>
              <p className={`metric-value text-[13px] font-semibold ${statement.net >= 0 ? "text-[var(--accent-primary)]" : "text-[#ffd7d3]"}`}>
                {formatCurrency(statement.net)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            actionHref="/finance#bank-statement-import"
            actionLabel="Import bank PDF"
            description="Your confirmed monthly bank statements will appear here with income, spending, and net totals."
            icon="PDF"
            title="No bank statements imported"
          />
        </div>
      )}
    </article>
  );
}

function formatStatementMonth(month: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function CashflowCard({
  summary,
}: {
  summary: ReturnType<typeof import("@/lib/finance").getFinanceSummary>;
}) {
  const maxValue = Math.max(
    1,
    ...summary.monthlyCashflow.flatMap((item) => [item.income, item.expense]),
  );
  const latest = summary.monthlyCashflow.at(-1);
  const previous = summary.monthlyCashflow.at(-2);
  const latestNet = latest ? latest.income - latest.expense : 0;
  const previousNet = previous ? previous.income - previous.expense : 0;
  const difference = latestNet - previousNet;

  return (
    <article className="content-panel rounded-[var(--radius-panel)] p-6 xl:col-span-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="label-caps text-[#c4c7c8]">Monthly cashflow</p>
          <h2 className="mt-2 text-[26px] font-semibold text-white">
            Income vs expenses
          </h2>
        </div>
        <span className="metric-value text-[12px] font-semibold text-[#c4c7c8]">
          6 months
        </span>
      </div>
      <p className="mb-5 text-[13px] leading-5 text-[var(--text-secondary)]">
        {latest && previous
          ? `${latest.month} net cashflow is ${difference >= 0 ? `${formatCurrency(difference)} ahead of` : `${formatCurrency(Math.abs(difference))} behind`} ${previous.month}.`
          : latest
            ? `${latest.month} net cashflow is ${formatCurrency(latestNet)}.`
            : "Import transactions to reveal monthly cashflow and comparisons."}
      </p>
      {summary.monthlyCashflow.length > 0 ? (
        <div className="flex h-72 items-end justify-between gap-3 sm:gap-4" aria-label="Monthly cashflow values">
          {summary.monthlyCashflow.map((item) => (
            <button
              aria-label={`${item.month}: income ${formatCurrency(item.income)}, expenses ${formatCurrency(item.expense)}, net ${formatCurrency(item.income - item.expense)}`}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center gap-3 rounded-[12px] outline-none focus-visible:bg-white/[0.035]"
              key={item.month}
              type="button"
            >
              <span className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden w-max -translate-x-1/2 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-3 py-2 text-left text-[11px] text-white shadow-xl group-hover:block group-focus-visible:block">
                Income {formatCurrency(item.income)} · Expense {formatCurrency(item.expense)}
              </span>
              <span className="flex w-full flex-1 items-end justify-center gap-1 sm:gap-2">
                <span className="w-full max-w-8 rounded-t-[10px] bg-[#a3e635]" style={{ height: `${(item.income / maxValue) * 100}%` }} />
                <span className="w-full max-w-8 rounded-t-[10px] bg-[#60a5fa]/45" style={{ height: `${(item.expense / maxValue) * 100}%` }} />
              </span>
              <span className="text-[12px] font-semibold uppercase text-[#c4c7c8]">
                {item.month.slice(5)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          actionHref="/finance#bank-statement-import"
          actionLabel="Import bank PDF"
          description="Import a monthly bank statement to compare income, expenses, and net cashflow over time."
          icon="€"
          title="No cashflow history yet"
        />
      )}
      {summary.monthlyCashflow.length > 0 ? (
        <details className="mt-5 border-t border-white/10 pt-4">
          <summary className="cursor-pointer text-[12px] font-semibold text-[#a3e635]">
            Accessible cashflow summary
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[#aeb2b4]"><tr><th className="pb-2">Month</th><th>Income</th><th>Expense</th></tr></thead>
              <tbody>{summary.monthlyCashflow.map((item) => <tr className="border-t border-white/[0.06]" key={item.month}><td className="py-2 text-white">{item.month}</td><td>{formatCurrency(item.income)}</td><td>{formatCurrency(item.expense)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function TransactionsCard({ transactions }: { transactions: FinanceTransaction[] }) {
  return (
    <article className="content-panel rounded-[var(--radius-panel)] p-6 xl:col-span-4">
      <p className="label-caps text-[#c4c7c8]">Latest transactions</p>
      <h2 className="mt-2 text-[24px] font-semibold text-white">Recent flow</h2>
      <div className="mt-5 space-y-3">
        {transactions.map((transaction) => (
          <div className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-3" key={transaction.id}>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-[13px] font-bold text-white">
              {transaction.category.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-white">{transaction.title}</p>
              <p className="text-[12px] text-[#c4c7c8]">
                {transaction.date} · {transaction.status}
              </p>
            </div>
            <p className={`text-[14px] font-semibold ${transaction.amount >= 0 ? "text-[#a3e635]" : "text-[#ffb4ab]"}`}>
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        ))}
        {transactions.length === 0 ? (
          <EmptyState
            actionHref="/finance#bank-statement-import"
            actionLabel="Import bank PDF"
            description="Your latest income and expenses will appear here after a statement import."
            icon="€"
            title="No transactions this period"
          />
        ) : null}
      </div>
    </article>
  );
}

function CategoryCard({
  summary,
}: {
  summary: ReturnType<typeof import("@/lib/finance").getFinanceSummary>;
}) {
  return (
    <article className="content-panel rounded-[var(--radius-panel)] p-6 xl:col-span-4">
      <p className="label-caps text-[#c4c7c8]">Category spend</p>
      <h2 className="mt-2 text-[24px] font-semibold text-white">This month</h2>
      <div className="mt-6 space-y-4">
        {summary.categorySpend.map((item, index) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between text-[13px]">
              <span className="font-semibold text-white">{item.label}</span>
              <span className="text-[#c4c7c8]">{item.value}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#353434]">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: categoryColors[index % categoryColors.length],
                  width: `${item.value}%`,
                }}
              />
            </div>
          </div>
        ))}
        {summary.categorySpend.length === 0 ? (
          <EmptyState
            actionHref="/finance#bank-statement-import"
            actionLabel="Import bank PDF"
            description="Expense categories appear after a monthly statement is imported."
            icon="◎"
            title="No category spending yet"
          />
        ) : null}
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--border-subtle)] py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
      <dt className="label-caps text-[#c4c7c8]">{label}</dt>
      <dd className="metric-value mt-2 text-[20px] font-semibold text-white">{value}</dd>
    </div>
  );
}
