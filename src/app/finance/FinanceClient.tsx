"use client";

import { useActionState } from "react";
import {
  FinanceTransaction,
  formatCurrency,
  sampleFinanceCsv,
  transactionsToCsv,
} from "@/lib/finance";
import {
  ImportState,
  clearFinanceDataAction,
  importFinanceCsvAction,
} from "./actions";

const initialImportState: ImportState = { errors: [], message: "" };
const categoryColors = ["#60a5fa", "#a3e635", "#a78bfa", "#f59e0b", "#ff4fa3"];

export function FinanceClient({
  summary,
  transactions,
}: {
  summary: ReturnType<typeof import("@/lib/finance").getFinanceSummary>;
  transactions: FinanceTransaction[];
}) {
  const [importState, importAction, importPending] = useActionState(
    importFinanceCsvAction,
    initialImportState,
  );

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
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label-caps text-[#a3e635]">Finance system</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[40px] text-white sm:text-[44px] sm:leading-[52px]">
            Finance overview
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#c4c7c8]">
            CSV-backed transaction management with live Supabase summaries.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-white/10 bg-[#201f1f] px-4 py-2 text-[13px] font-semibold text-[#c4c7c8]"
            onClick={() => download("orbit-finance-sample.csv", sampleFinanceCsv)}
            type="button"
          >
            Download sample CSV
          </button>
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
        <article className="glass-panel relative min-h-[300px] overflow-hidden rounded-[24px] p-6 xl:col-span-6 xl:row-span-2">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-bl-full bg-gradient-to-bl from-[#a3e635]/15 to-transparent" />
          <p className="label-caps text-[#c4c7c8]">Available balance</p>
          <p className="relative mt-4 text-[46px] font-bold leading-[54px] text-white sm:text-[58px] sm:leading-[64px]">
            {formatCurrency(summary.availableBalance)}
          </p>
          <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
            <MiniStat label="Income" value={formatCurrency(summary.income)} />
            <MiniStat label="Expenses" value={formatCurrency(summary.expenses)} />
            <MiniStat label="Net" value={formatCurrency(summary.netCashflow)} />
          </div>
        </article>

        <ImportCard importAction={importAction} importPending={importPending} importState={importState} />
        <CashflowCard summary={summary} />
        <TransactionsCard transactions={summary.recentTransactions} />
        <CategoryCard summary={summary} />
      </section>
    </section>
  );
}

function ImportCard({
  importAction,
  importPending,
  importState,
}: {
  importAction: (formData: FormData) => void;
  importPending: boolean;
  importState: ImportState;
}) {
  return (
    <article className="glass-panel rounded-[24px] p-6 xl:col-span-6">
      <p className="label-caps text-[#c4c7c8]">CSV tools</p>
      <form action={importAction} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          accept=".csv,text/csv"
          className="field-input file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#202020]"
          name="csv"
          required
          type="file"
        />
        <button
          className="rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-[#202020] disabled:opacity-60"
          disabled={importPending}
          type="submit"
        >
          {importPending ? "Importing..." : "Import CSV"}
        </button>
      </form>
      {importState.message ? (
        <p className="mt-4 rounded-[14px] border border-[#a3e635]/25 bg-[#a3e635]/10 p-3 text-[13px] text-[#d9f99d]">
          {importState.message}
        </p>
      ) : null}
      {importState.errors.length > 0 ? (
        <div className="mt-3 rounded-[14px] border border-[#ffb4ab]/25 bg-[#ffb4ab]/10 p-3 text-[13px] text-[#ffdad6]">
          {importState.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
      <form action={clearFinanceDataAction} className="mt-4">
        <button className="rounded-[14px] border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-2 text-[13px] font-semibold text-[#ffdad6]" type="submit">
          Clear finance data
        </button>
      </form>
    </article>
  );
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

  return (
    <article className="glass-panel rounded-[24px] p-6 xl:col-span-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="label-caps text-[#c4c7c8]">Monthly cashflow</p>
          <h2 className="mt-2 text-[26px] font-semibold text-white">
            Income vs expenses
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-[#201f1f] px-3 py-1.5 text-[12px] font-semibold text-[#c4c7c8]">
          6 months
        </span>
      </div>
      <div className="flex h-72 items-end justify-between gap-4">
        {summary.monthlyCashflow.map((item) => (
          <div className="flex h-full min-w-0 flex-1 flex-col items-center gap-3" key={item.month}>
            <div className="flex w-full flex-1 items-end justify-center gap-2">
              <div className="w-full max-w-8 rounded-t-[10px] bg-[#a3e635]" style={{ height: `${(item.income / maxValue) * 100}%` }} />
              <div className="w-full max-w-8 rounded-t-[10px] bg-[#60a5fa]/45" style={{ height: `${(item.expense / maxValue) * 100}%` }} />
            </div>
            <span className="text-[12px] font-semibold uppercase text-[#c4c7c8]">
              {item.month.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function TransactionsCard({ transactions }: { transactions: FinanceTransaction[] }) {
  return (
    <article className="glass-panel rounded-[24px] p-6 xl:col-span-4">
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
    <article className="glass-panel rounded-[24px] p-6 xl:col-span-4">
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
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#201f1f]/60 p-4">
      <p className="label-caps text-[#c4c7c8]">{label}</p>
      <p className="mt-2 text-[20px] font-semibold text-white">{value}</p>
    </div>
  );
}
