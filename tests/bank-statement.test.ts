import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStatementCategoryOverrides,
  parseBankStatementText,
  statementFingerprintPayload,
} from "../src/lib/bank-statement";

test("parses common European statement rows and ignores running balances", () => {
  const preview = parseBankStatementText(`
Account statement July 2026
01.07.2026 01.07.2026 CARD PAYMENT LIDL -45,20 EUR 1 204,80 EUR
02.07.2026 02.07.2026 SALARY +2 450,00 EUR 3 654,80 EUR
03.07.2026 BANK FEE 2,50 EUR 3 652,30 EUR
`, "2026-07");

  assert.equal(preview.rows.length, 3);
  assert.deepEqual(preview.rows.map((row) => row.amount), [-45.2, 2450, -2.5]);
  assert.deepEqual(preview.rows.map((row) => row.category), ["Groceries", "Income", "Bank fees"]);
  assert.equal(preview.income, 2450);
  assert.equal(preview.expenses, 47.7);
  assert.equal(preview.net, 2402.3);
  assert.match(preview.warnings.join(" "), /multiple amount/i);
});

test("infers the year, masks account numbers, and preserves repeated payments", () => {
  const preview = parseBankStatementText(`
01.07. CARD PAYMENT SK3112000000198742637541 -10,00 EUR
01.07. CARD PAYMENT SK3112000000198742637541 -10,00 EUR
`, "2026-07");

  assert.equal(preview.rows.length, 2);
  assert.equal(preview.rows[0].date, "2026-07-01");
  assert.doesNotMatch(preview.rows[0].title, /SK3112/);
  assert.match(preview.rows[0].title, /Account/);
});

test("distinguishes Slovak incoming and outgoing bank transfers", () => {
  const preview = parseBankStatementText(`
Dátum sprac. Popis Dátum zúčt. Suma
01.07.2026 Platba 0900/1234567890 300,00
Prijatá platba: SK3112000000198742637541
Suma: 300,00 EUR Valuta: 01.07.2026
02.07.2026 Platba 1100/1234567890 30,06 75,50-
Odoslaná platba: SK3112000000198742637541
Suma: 75,50 EUR Valuta: 02.07.2026
`, "2026-07");

  assert.deepEqual(preview.rows.map((row) => row.amount), [300, -75.5]);
  assert.deepEqual(preview.rows.map((row) => row.category), ["Income", "Transfers"]);
  assert.equal(preview.income, 300);
  assert.equal(preview.expenses, 75.5);
  assert.equal(preview.net, 224.5);
});

test("uses reliable transaction-type categories as a fallback", () => {
  const preview = parseBankStatementText(`
01.07.2026 PLATBA KARTOU LOCAL MERCHANT 12,00-
02.07.2026 VYBER BANKOMAT 40,00-
03.07.2026 POPLATOK ZA UCET 3,00
`, "2026-07");

  assert.deepEqual(
    preview.rows.map((row) => row.category),
    ["Card purchases", "Cash", "Bank fees"],
  );
});

test("uses a deterministic normalized payload for duplicate protection", () => {
  const rows = parseBankStatementText(
    "01.07.2026 COFFEE SHOP -3,20 EUR\n",
    "2026-07",
  ).rows;

  assert.equal(
    statementFingerprintPayload("2026-07", rows),
    statementFingerprintPayload("2026-07", rows),
  );
});

test("rejects invalid months and PDFs without transactions", () => {
  assert.throws(
    () => parseBankStatementText("01.07.2026 statement header", "2026-07"),
    /No transactions were detected/,
  );
  assert.throws(
    () => parseBankStatementText("01.07.2026 PAYMENT -1,00 EUR", "2026-13"),
    /valid statement month/,
  );
});

test("applies only allowlisted statement category corrections", () => {
  const rows = parseBankStatementText(
    "01.07.2026 CARD PAYMENT LOCAL MERCHANT -12,00 EUR\n02.07.2026 BANK FEE -3,00 EUR",
    "2026-07",
  ).rows;
  const corrected = applyStatementCategoryOverrides(
    rows,
    JSON.stringify([{ category: "Dining", index: 0 }]),
  );

  assert.equal(corrected[0].category, "Dining");
  assert.equal(corrected[1].category, "Bank fees");
  assert.equal(rows[0].category, "Card purchases");
  assert.throws(
    () => applyStatementCategoryOverrides(
      rows,
      JSON.stringify([{ category: "Anything", index: 0 }]),
    ),
    /Invalid statement category corrections/,
  );
  assert.throws(
    () => applyStatementCategoryOverrides(
      rows,
      JSON.stringify([
        { category: "Dining", index: 0 },
        { category: "Other", index: 0 },
      ]),
    ),
    /Invalid statement category corrections/,
  );
});
