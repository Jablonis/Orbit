import assert from "node:assert/strict";
import test from "node:test";
import { transactionsToCsv } from "../src/lib/finance";

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
