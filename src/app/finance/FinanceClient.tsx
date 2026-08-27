"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { BankStatementImporter } from "@/components/BankStatementImporter";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Pip } from "@/components/brand/Pip";
import { getPanelPip } from "@/lib/mascot";
import {
  type FinanceStatementImport,
  type FinanceTransaction,
  formatCurrency,
  getFinanceSummary,
  getFinanceStatementCoverage,
  transactionsToCsv,
} from "@/lib/finance";
import type { RegionalPreferences } from "@/lib/preferences";
import {
  archiveFinanceTransactionAction,
  clearFinanceDataAction,
  restoreFinanceDataAction,
  saveFinanceTransactionAction,
} from "./actions";

const categoryColors = [
  "var(--finance)",
  "var(--primary)",
  "var(--plum)",
  "var(--warning)",
  "var(--tasks)",
] as const;

export function FinanceClient({
  regional,
  statementImports,
  summary,
  transactions,
}: {
  regional: RegionalPreferences;
  statementImports: FinanceStatementImport[];
  summary: ReturnType<typeof import("@/lib/finance").getFinanceSummary>;
  transactions: FinanceTransaction[];
}) {
  const router = useRouter();
  const [archivedAt, setArchivedAt] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(summary.currentMonth);
  const [undoError, setUndoError] = useState("");
  const [undoPending, setUndoPending] = useState(false);
  const periodSummary = getFinanceSummary(transactions, selectedMonth);
  const selectedIndex = periodSummary.monthlyCashflow.findIndex(
    (month) => month.month === selectedMonth,
  );
  const currentMonth = periodSummary.monthlyCashflow[selectedIndex];
  const previousMonth =
    selectedIndex > 0 ? periodSummary.monthlyCashflow[selectedIndex - 1] : undefined;
  const currentNet = currentMonth ? currentMonth.income - currentMonth.expense : 0;
  const previousNet = previousMonth ? previousMonth.income - previousMonth.expense : 0;
  const netChange = currentNet - previousNet;
  // The ledger's editor is lifted here so the recent-flow list can hand it a
  // row: a row that looks like a control now is one, for the entries Orbit is
  // allowed to change.
  const [editingTransaction, setEditingTransaction] =
    useState<FinanceTransaction | null>(null);
  const editTransaction = (transaction: FinanceTransaction | null) => {
    setEditingTransaction(transaction);
    if (transaction) {
      document
        .getElementById("manual-ledger")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const coverage = getFinanceStatementCoverage(statementImports);
  // Settled against everything on the books this month: the one thing on this
  // page that behaves like a day's worth of work being finished.
  const monthPip = getPanelPip(
    transactions.filter(
      (transaction) =>
        transaction.status === "paid" &&
        transaction.date.startsWith(selectedMonth),
    ).length,
    transactions.filter((transaction) => transaction.date.startsWith(selectedMonth))
      .length,
    "this month",
  );
  const monthOptions = [
    ...new Set([
      summary.currentMonth,
      ...transactions.map((transaction) => transaction.date.slice(0, 7)),
      ...statementImports.map((statement) => statement.statementMonth),
    ]),
  ].sort((a, b) => b.localeCompare(a));
  const money = (value: number) =>
    formatCurrency(value, {
      currency: regional.currency,
      locale: regional.locale,
    });

  async function undoClear() {
    if (!archivedAt || undoPending) return;
    setUndoPending(true);
    setUndoError("");
    try {
      const result = await restoreFinanceDataAction(archivedAt);
      if (result.ok) {
        setArchivedAt(null);
        return;
      }
      setUndoError(result.error);
    } catch {
      setUndoError("Finance data could not be restored. Please try again.");
    } finally {
      setUndoPending(false);
    }
  }

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
    <section
      className="page-container py-8"
      data-finance-private={privacyMode}
    >
      <header className="mb-8 flex flex-col gap-5 pr-14 md:pr-0 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <Pip
            burn={monthPip.burn}
            className="h-12 w-auto shrink-0 sm:h-16"
            mood={monthPip.mood}
            seed={18}
            size={64}
            title={monthPip.title}
          />
          <div>
          <p className="label-caps text-primary">Finance system</p>
          <h1 className="page-title mt-2 text-foreground">
            {`${formatStatementMonth(selectedMonth, regional.locale)} cashflow`}
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
            {transactions.length} active transaction{transactions.length === 1 ? "" : "s"} across{" "}
            {statementImports.length} imported statement{statementImports.length === 1 ? "" : "s"}.
          </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1">
            <span className="label-caps text-muted-foreground">Summary month</span>
            <select
              aria-label="Finance summary month"
              className="field-input min-w-[190px]"
              onChange={(event) => setSelectedMonth(event.target.value)}
              value={selectedMonth}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatStatementMonth(month, regional.locale)}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-pressed={privacyMode}
            className="min-h-11 rounded-full border border-input bg-[rgba(244,235,221,0.045)] px-4 py-2 text-[13px] font-semibold text-foreground"
            onClick={() => {
              const next = !privacyMode;
              setPrivacyMode(next);
            }}
            type="button"
          >
            {privacyMode ? "Show amounts" : "Hide amounts"}
          </button>
          <button
            className="min-h-11 rounded-full border border-input bg-card px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
            onClick={() => download("orbit-finance-export.csv", transactionsToCsv(transactions))}
            type="button"
          >
            Export all data
          </button>
        </div>
      </header>

      <FinanceDataStatus coverage={coverage} locale={regional.locale} />

      <section className="grid gap-6 xl:grid-cols-12">
        <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] relative min-h-[300px] overflow-hidden rounded-2xl p-6 xl:col-span-12">
          <p className="label-caps text-muted-foreground">
            {`${formatStatementMonth(selectedMonth, regional.locale)} paid net cashflow`}
          </p>
          <p className="metric-value relative mt-4 text-[46px] font-bold leading-[54px] text-foreground sm:text-[58px] sm:leading-[64px]">
            {money(periodSummary.netCashflow)}
          </p>
          <p className={`metric-value relative mt-3 text-[13px] font-semibold ${netChange >= 0 ? "text-primary" : "text-destructive"}`}>
            {previousMonth
              ? `${netChange >= 0 ? "+" : ""}${money(netChange)} net change versus ${formatStatementMonth(previousMonth.month, regional.locale)}`
              : "Add another month of data to unlock period comparison."}
          </p>
          <dl className="relative mt-8 grid border-y border-border sm:grid-cols-3">
            <MiniStat label="Paid income" value={money(periodSummary.income)} />
            <MiniStat label="Paid expenses" value={money(periodSummary.expenses)} />
            <MiniStat label="All-history imported net" value={money(periodSummary.availableBalance)} />
          </dl>
          <dl className="relative mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Pending net" value={money(periodSummary.pendingNet)} />
            <MiniStat label="Scheduled net" value={money(periodSummary.scheduledNet)} />
          </dl>
        </article>

        <CashflowCard regional={regional} summary={periodSummary} />
        <TransactionsCard
          onEdit={editTransaction}
          regional={regional}
          transactions={periodSummary.recentTransactions}
        />
        <CategoryCard regional={regional} summary={periodSummary} />
        <StatementHistoryCard regional={regional} statementImports={statementImports} />
      </section>
      <section aria-labelledby="finance-utilities-title" className="mt-10">
        <p className="label-caps text-muted-foreground">Utilities</p>
        <h2 className="mt-1 text-[22px] font-semibold text-foreground" id="finance-utilities-title">Statement import and maintenance</h2>
        <div className="mt-4 grid gap-6 xl:grid-cols-12">
          <ManualTransactionsCard
            editing={editingTransaction}
            onChanged={() => router.refresh()}
            onEdit={editTransaction}
            regional={regional}
            selectedMonth={selectedMonth}
            transactions={transactions}
          />
          <BankStatementImporter initialMonth={selectedMonth} regional={regional} />
          <MaintenanceCard
            onCleared={(value) => {
              setArchivedAt(value);
              setUndoError("");
            }}
          />
        </div>
      </section>
      {archivedAt ? (
        <ActionToast
          action={(
            <button
              className="min-h-11 shrink-0 px-2 font-bold text-primary"
              disabled={undoPending}
              onClick={() => void undoClear()}
              type="button"
            >
              {undoPending ? "Restoring…" : undoError ? "Retry" : "Undo"}
            </button>
          )}
          message={undoError || "Finance data archived."}
          tone={undoError ? "error" : "success"}
        />
      ) : null}
    </section>
  );
}

function FinanceDataStatus({
  coverage,
  locale,
}: {
  coverage: ReturnType<typeof getFinanceStatementCoverage>;
  locale: string;
}) {
  const hasGaps = coverage.gapMonths.length > 0;
  const hasOverlaps = coverage.overlappingMonths.length > 0;
  return (
    <aside className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] mb-6 grid gap-4 rounded-xl p-4 sm:grid-cols-3 sm:p-5">
      <div>
        <p className="label-caps text-muted-foreground">Last successful import</p>
        <p className="mt-2 text-[13px] font-semibold text-foreground">
          {coverage.latestImportAt
            ? new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(coverage.latestImportAt))
            : "No statement imported"}
        </p>
      </div>
      <div>
        <p className="label-caps text-muted-foreground">Statement coverage</p>
        <p className="mt-2 text-[13px] font-semibold text-foreground">
          {coverage.latestStatementMonth
            ? `Through ${formatStatementMonth(coverage.latestStatementMonth, locale)}`
            : "No covered period"}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {hasGaps
            ? `${coverage.gapMonths.length} missing month${coverage.gapMonths.length === 1 ? "" : "s"}: ${coverage.gapMonths.join(", ")}`
            : "No gaps between imported months."}
        </p>
      </div>
      <div>
        <p className="label-caps text-muted-foreground">Data confidence</p>
        <p className="mt-2 text-[13px] font-semibold text-foreground">
          {hasOverlaps ? "Review overlapping statements" : "No overlaps detected"}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {hasOverlaps
            ? `Multiple imports cover ${coverage.overlappingMonths.join(", ")}.`
            : "Totals are calculated from saved statement transactions."}
        </p>
      </div>
    </aside>
  );
}

function ManualTransactionsCard({
  editing,
  onChanged,
  onEdit,
  regional,
  selectedMonth,
  transactions,
}: {
  editing: FinanceTransaction | null;
  onChanged: () => void;
  onEdit: (transaction: FinanceTransaction | null) => void;
  regional: RegionalPreferences;
  selectedMonth: string;
  transactions: FinanceTransaction[];
}) {
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const visible = transactions
    .filter((transaction) => !transaction.statementImportId)
    .slice(0, 12);

  async function save(formData: FormData) {
    setPending(true);
    setNotice("");
    try {
      const result = await saveFinanceTransactionAction(formData);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      onEdit(null);
      setNotice("Transaction saved.");
      onChanged();
    } catch {
      setNotice("The transaction could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] scroll-mt-24 rounded-2xl p-6 xl:col-span-12" id="manual-ledger">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps text-finance">Manual ledger</p>
          <h3 className="mt-2 text-[22px] font-semibold text-foreground">
            Add or correct a transaction
          </h3>
        </div>
        <p aria-live="polite" className="text-[12px] text-muted-foreground">
          {notice || "Manual entries share the protected ledger without changing imported statement records."}
        </p>
      </div>
      <form
        action={save}
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto]"
        key={editing?.id ?? "new"}
      >
        <input name="id" type="hidden" value={editing?.id ?? ""} />
        <label className="grid gap-2">
          <span className="label-caps text-muted-foreground">Date</span>
          <input className="field-input" defaultValue={editing?.date ?? `${selectedMonth}-01`} name="date" required type="date" />
        </label>
        <label className="grid gap-2">
          <span className="label-caps text-muted-foreground">Title</span>
          <input className="field-input" defaultValue={editing?.title ?? ""} maxLength={200} name="title" required />
        </label>
        <label className="grid gap-2">
          <span className="label-caps text-muted-foreground">Category</span>
          <input className="field-input" defaultValue={editing?.category ?? ""} maxLength={80} name="category" required />
        </label>
        <label className="grid gap-2">
          <span className="label-caps text-muted-foreground">Amount</span>
          <input className="field-input" defaultValue={editing?.amount ?? ""} name="amount" required step="0.01" type="number" />
        </label>
        <label className="grid gap-2">
          <span className="label-caps text-muted-foreground">Status</span>
          <select className="field-input" defaultValue={editing?.status ?? "paid"} name="status">
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="min-h-11 rounded-xl bg-primary px-4 text-[12px] font-bold text-primary-foreground disabled:opacity-50" disabled={pending} type="submit">
            {pending ? "Saving…" : editing ? "Save" : "Add"}
          </button>
          {editing ? (
            <button className="min-h-11 px-2 text-[12px] font-semibold text-muted-foreground" onClick={() => onEdit(null)} type="button">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <div className="mt-6 border-t border-border">
        {visible.map((transaction) => (
          <div className="grid gap-3 border-b border-border py-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center" key={transaction.id}>
            <time className="metric-value text-[12px] text-muted-foreground" dateTime={transaction.date}>{transaction.date}</time>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{transaction.title}</p>
              <p className="text-[12px] text-muted-foreground">{transaction.category} · {transaction.status}</p>
            </div>
            <p className="metric-value text-[13px] text-foreground">{formatCurrency(transaction.amount, regional)}</p>
            <div className="flex gap-2">
              <button className="min-h-11 px-2 text-[12px] font-semibold text-primary" onClick={() => onEdit(transaction)} type="button">Edit</button>
              <ConfirmDialog
                confirmLabel="Archive"
                description={`“${transaction.title}” will leave active finance totals.`}
                onConfirm={() => archiveFinanceTransactionAction(transaction.id)}
                onSuccess={onChanged}
                title="Archive transaction?"
                triggerClassName="min-h-11 px-2 text-[12px] font-semibold text-destructive"
                triggerLabel="Archive"
              />
            </div>
          </div>
        ))}
        {visible.length === 0 ? (
          <p className="py-4 text-[12px] text-muted-foreground">
            No manual transactions yet. Imported rows remain read-only here so
            statement totals stay reconcilable.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function MaintenanceCard({
  onCleared,
}: {
  onCleared: (archivedAt: string) => void;
}) {
  return (
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] rounded-2xl p-6 xl:col-span-5">
      <p className="label-caps text-muted-foreground">Data maintenance</p>
      <h3 className="mt-2 text-[22px] font-semibold text-foreground">Manage finance history</h3>
      <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
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
          triggerClassName="rounded-xl border border-[var(--destructive)]/20 bg-destructive/10 px-4 py-2 text-[13px] font-semibold text-destructive"
          triggerLabel="Clear finance data"
        />
      </div>
    </article>
  );
}

function StatementHistoryCard({
  regional,
  statementImports,
}: {
  regional: RegionalPreferences;
  statementImports: FinanceStatementImport[];
}) {
  return (
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] rounded-2xl p-6 xl:col-span-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps text-muted-foreground">Monthly statements</p>
          <h2 className="mt-2 text-[24px] font-semibold text-foreground">Import history</h2>
        </div>
        <span className="metric-value text-[12px] font-semibold text-muted-foreground">
          {statementImports.length} saved
        </span>
      </div>
      {statementImports.length > 0 ? (
        <div className="mt-5 border-y border-border">
          {statementImports.slice(0, 6).map((statement) => (
            <div className="grid gap-4 border-b border-border py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center" key={statement.id}>
              <div className="flex items-start justify-between gap-3 sm:block">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">
                    {formatStatementMonth(statement.statementMonth, regional.locale)}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {statement.transactionCount} transactions · {statement.currency}
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground">Income <span className="metric-value block pt-1 font-semibold text-foreground">{formatCurrency(statement.income, regional)}</span></p>
              <p className="text-[12px] text-muted-foreground">Expenses <span className="metric-value block pt-1 font-semibold text-foreground">{formatCurrency(statement.expenses, regional)}</span></p>
              <p className={`metric-value text-[13px] font-semibold ${statement.net >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(statement.net, regional)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            seed={1}
            actionHref="/finance#bank-statement-import"
            actionLabel="Import bank PDF"
            description="Your confirmed monthly bank statements will appear here with income, spending, and net totals."
            title="No bank statements imported"
          />
        </div>
      )}
    </article>
  );
}

function formatStatementMonth(month: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function CashflowCard({
  regional,
  summary,
}: {
  regional: RegionalPreferences;
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
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] rounded-2xl p-6 xl:col-span-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="label-caps text-muted-foreground">Monthly cashflow</p>
          <h2 className="mt-2 text-[26px] font-semibold text-foreground">
            Income vs expenses
          </h2>
        </div>
        <span className="metric-value text-[12px] font-semibold text-muted-foreground">
          6 months
        </span>
      </div>
      <p className="metric-value mb-5 text-[13px] leading-5 text-muted-foreground">
        {latest && previous
          ? `${formatStatementMonth(latest.month, regional.locale)} net cashflow is ${difference >= 0 ? `${formatCurrency(difference, regional)} ahead of` : `${formatCurrency(Math.abs(difference), regional)} behind`} ${formatStatementMonth(previous.month, regional.locale)}.`
          : latest
            ? `${formatStatementMonth(latest.month, regional.locale)} net cashflow is ${formatCurrency(latestNet, regional)}.`
            : "Import transactions to reveal monthly cashflow and comparisons."}
      </p>
      {summary.monthlyCashflow.length > 0 ? (
        <div className="flex h-72 items-end justify-between gap-3 sm:gap-4" aria-label="Monthly cashflow values">
          {summary.monthlyCashflow.map((item, index) => (
            <button
              aria-label={`${item.month}: income ${formatCurrency(item.income, regional)}, expenses ${formatCurrency(item.expense, regional)}, net ${formatCurrency(item.income - item.expense, regional)}`}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center gap-3 rounded-xl outline-none focus-visible:bg-[rgba(244,235,221,0.035)]"
              key={item.month}
              type="button"
            >
              <span
                className={`metric-value pointer-events-none absolute -top-2 z-10 hidden max-w-[min(18rem,80vw)] rounded-xl border border-border bg-secondary px-3 py-2 text-left text-[12px] text-foreground shadow-xl group-hover:block group-focus-visible:block ${
                  index === 0
                    ? "left-0"
                    : index === summary.monthlyCashflow.length - 1
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2"
                }`}
              >
                Income {formatCurrency(item.income, regional)} · Expense {formatCurrency(item.expense, regional)}
              </span>
              <span className="flex w-full flex-1 items-end justify-center gap-1 sm:gap-2">
                <span className="w-full max-w-8 rounded-t-[10px] bg-primary" style={{ height: `${(item.income / maxValue) * 100}%` }} />
                <span className="w-full max-w-8 rounded-t-[10px] bg-finance/45" style={{ height: `${(item.expense / maxValue) * 100}%` }} />
              </span>
              <span className="text-[12px] font-semibold uppercase text-muted-foreground">
                {item.month.slice(5)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
            seed={2}
          actionHref="/finance#bank-statement-import"
          actionLabel="Import bank PDF"
          description="Import a monthly bank statement to compare income, expenses, and net cashflow over time."
          title="No cashflow history yet"
        />
      )}
      {summary.monthlyCashflow.length > 0 ? (
        <details className="mt-5 border-t border-[rgba(244,235,221,0.1)] pt-4">
          <summary className="cursor-pointer text-[12px] font-semibold text-primary">
            Accessible cashflow summary
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-muted-foreground"><tr><th className="pb-2">Month</th><th>Income</th><th>Expense</th></tr></thead>
              <tbody>{summary.monthlyCashflow.map((item) => <tr className="border-t border-[rgba(244,235,221,0.06)]" key={item.month}><td className="py-2 text-foreground">{item.month}</td><td className="metric-value">{formatCurrency(item.income, regional)}</td><td className="metric-value">{formatCurrency(item.expense, regional)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function TransactionsCard({
  onEdit,
  regional,
  transactions,
}: {
  onEdit: (transaction: FinanceTransaction) => void;
  regional: RegionalPreferences;
  transactions: FinanceTransaction[];
}) {
  return (
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] rounded-2xl p-6 xl:col-span-4">
      <p className="label-caps text-muted-foreground">Latest transactions</p>
      <h2 className="mt-2 text-[24px] font-semibold text-foreground">Recent flow</h2>
      <div className="mt-5 space-y-3">
        {transactions.map((transaction) => {
          // Imported rows are deliberately read-only, so they are drawn as a
          // record and say why; a manual row opens in the ledger below.
          const imported = Boolean(transaction.statementImportId);
          const body = (
            <>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[rgba(244,235,221,0.08)] text-[13px] font-bold text-foreground">
                {transaction.category.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[14px] font-semibold text-foreground">{transaction.title}</p>
                <p className="text-[12px] text-muted-foreground">
                  {transaction.date} · {transaction.status}
                  {imported ? " · imported" : ""}
                </p>
              </div>
              <p className={`metric-value text-[14px] font-semibold ${transaction.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(transaction.amount, regional)}
              </p>
            </>
          );
          return imported ? (
            <div
              className="scroll-mt-24 flex items-center gap-3 rounded-xl border border-[rgba(244,235,221,0.1)] bg-muted/55 p-3"
              id={`transaction-${transaction.id}`}
              key={transaction.id}
            >
              {body}
            </div>
          ) : (
            <button
              className="scroll-mt-24 flex w-full items-center gap-3 rounded-xl border border-[rgba(244,235,221,0.1)] bg-muted/55 p-3 transition duration-150 hover:border-primary/35 hover:bg-muted active:scale-[0.99]"
              id={`transaction-${transaction.id}`}
              key={transaction.id}
              onClick={() => onEdit(transaction)}
              type="button"
            >
              {body}
            </button>
          );
        })}
        {transactions.length === 0 ? (
          <EmptyState
            seed={3}
            actionHref="/finance#bank-statement-import"
            actionLabel="Import bank PDF"
            description="Your latest income and expenses will appear here after a statement import."
            title="No transactions this period"
          />
        ) : null}
      </div>
    </article>
  );
}

function CategoryCard({
  regional,
  summary,
}: {
  regional: RegionalPreferences;
  summary: ReturnType<typeof import("@/lib/finance").getFinanceSummary>;
}) {
  return (
    <article className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(27,26,31,0.05)] rounded-2xl p-6 xl:col-span-4">
      <p className="label-caps text-muted-foreground">Category spend</p>
      <h2 className="mt-2 text-[24px] font-semibold text-foreground">This month</h2>
      <div className="mt-6 space-y-4">
        {summary.categorySpend.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between text-[13px]">
              <span className="font-semibold text-foreground">{item.label}</span>
              <span className="metric-value text-muted-foreground">
                {formatCurrency(item.amount, regional)} · {item.value}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: getCategoryColor(item.label),
                  width: `${item.value}%`,
                }}
              />
            </div>
          </div>
        ))}
        {summary.categorySpend.length === 0 ? (
          <EmptyState
            seed={4}
            actionHref="/finance#bank-statement-import"
            actionLabel="Import bank PDF"
            description="Expense categories appear after a monthly statement is imported."
            title="No category spending yet"
          />
        ) : null}
      </div>
    </article>
  );
}

function getCategoryColor(label: string) {
  const hash = [...label].reduce(
    (total, character) => (total * 31 + character.codePointAt(0)!) >>> 0,
    0,
  );
  return categoryColors[hash % categoryColors.length];
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric-value mt-2 text-[20px] font-semibold text-foreground">{value}</dd>
    </div>
  );
}
