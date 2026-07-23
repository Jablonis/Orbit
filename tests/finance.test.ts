import assert from "node:assert/strict";
import test from "node:test";
import {
  getFinanceStatementCoverage,
  getFinanceSummary,
  transactionsToCsv,
} from "../src/lib/finance";

test("neutralizes spreadsheet formulas in exported text cells", () => {
  const csv = transactionsToCsv([
    {
      amount: -42.5,
      category: "+Injected category",
      date: "2026-07-23",
      id: "transaction-1",
      status: "paid",
      title: "=HYPERLINK(\"https://example.invalid\")",
    },
    {
      amount: 100,
      category: "Income",
      date: "2026-07-24",
      id: "transaction-2",
      status: "paid",
      title: "  @SUM(1+1)",
    },
  ]);

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.invalid""\)"/);
  assert.match(csv, /'\+Injected category/);
  assert.match(csv, /'  @SUM\(1\+1\)/);
  assert.match(csv, /,-42\.5,paid/);
});

test("reports statement gaps, overlaps, and the newest successful import", () => {
  const coverage = getFinanceStatementCoverage([
    {
      createdAt: "2026-07-22T12:00:00Z",
      currency: "EUR",
      expenses: 10,
      id: "july-a",
      income: 20,
      net: 10,
      statementMonth: "2026-07",
      transactionCount: 2,
    },
    {
      createdAt: "2026-07-23T12:00:00Z",
      currency: "EUR",
      expenses: 10,
      id: "july-b",
      income: 20,
      net: 10,
      statementMonth: "2026-07",
      transactionCount: 2,
    },
    {
      createdAt: "2026-05-20T12:00:00Z",
      currency: "EUR",
      expenses: 10,
      id: "may",
      income: 20,
      net: 10,
      statementMonth: "2026-05",
      transactionCount: 2,
    },
  ]);

  assert.deepEqual(coverage.gapMonths, ["2026-06"]);
  assert.deepEqual(coverage.overlappingMonths, ["2026-07"]);
  assert.equal(coverage.latestImportAt, "2026-07-23T12:00:00Z");
  assert.equal(coverage.latestStatementMonth, "2026-07");
});

test("summarizes the requested calendar month and separates commitments", () => {
  const summary = getFinanceSummary(
    [
      { amount: 200, category: "Income", date: "2026-07-02", id: "a", status: "paid", title: "Paid" },
      { amount: -50, category: "Food", date: "2026-07-03", id: "b", status: "paid", title: "Groceries" },
      { amount: -20, category: "Bills", date: "2026-07-04", id: "c", status: "pending", title: "Pending bill" },
      { amount: -30, category: "Bills", date: "2026-07-05", id: "d", status: "scheduled", title: "Scheduled bill" },
      { amount: 999, category: "Income", date: "2026-06-01", id: "e", status: "paid", title: "Older month" },
    ],
    "2026-07",
  );

  assert.equal(summary.currentMonth, "2026-07");
  assert.equal(summary.income, 200);
  assert.equal(summary.expenses, 50);
  assert.equal(summary.netCashflow, 150);
  assert.equal(summary.pendingNet, -20);
  assert.equal(summary.scheduledNet, -30);
  assert.equal(summary.recentTransactions.length, 4);
});
