import type { FinanceInput } from "@/lib/finance";

export type BankStatementPreview = {
  expenses: number;
  income: number;
  net: number;
  rows: FinanceInput[];
  warnings: string[];
};

const dateTokenSource = String.raw`(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\.?)`;
const startDatePattern = new RegExp(`^(${dateTokenSource})(?=\\s|$)`);
const secondDatePattern = new RegExp(`^\\s*${dateTokenSource}(?=\\s|$)`);
const amountPattern = /(?<!\d)([+\-−]?\s*(?:\d{1,3}(?:[ .'’]\d{3})+|\d+)[,.]\d{2}\s*[-+]?)(?:\s*(?:EUR|€))?(?!\d)/giu;

const incomeWords = [
  "credit",
  "income",
  "incoming",
  "mzda",
  "plat salary",
  "prijata platba",
  "pripis",
  "prijem",
  "príjem",
  "refund",
  "salary",
  "vklad",
  "vratka",
];

const expenseWords = [
  "card",
  "cash withdrawal",
  "debit",
  "fee",
  "inkaso",
  "odchadzajuci",
  "odchádzajúci",
  "odoslana platba",
  "payment",
  "platba",
  "poplatok",
  "vyber",
  "výber",
];

export function parseBankStatementText(
  rawText: string,
  statementMonth: string,
): BankStatementPreview {
  if (!isValidStatementMonth(statementMonth)) {
    throw new Error("Choose a valid statement month.");
  }

  const lines = rawText
    .normalize("NFKC")
    .replaceAll("\u00a0", " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const usesFinalAmountColumn = lines.some((line) =>
    /Dátum sprac\.\s+Popis\s+Dátum zúčt\.\s+Suma/iu.test(line),
  );
  const blocks: Array<{ firstLine: string; text: string }> = [];
  let current: { firstLine: string; text: string } | null = null;

  for (const line of lines) {
    if (startDatePattern.test(line)) {
      if (current) blocks.push(current);
      current = { firstLine: line, text: line };
    } else if (current && current.text.length < 1200) {
      current.text = `${current.text} ${line}`;
    }
  }
  if (current) blocks.push(current);

  const rows: FinanceInput[] = [];
  let ambiguousAmounts = 0;
  let inferredSigns = 0;
  let skippedDatedRows = 0;
  let outsideMonth = 0;

  for (const statementBlock of blocks.slice(0, 750)) {
    const block = statementBlock.text;
    const dateMatch = block.match(startDatePattern);
    if (!dateMatch) continue;
    const date = parseStatementDate(dateMatch[1], statementMonth);
    if (!date) {
      skippedDatedRows += 1;
      continue;
    }

    const remainder = block
      .slice(dateMatch[0].length)
      .replace(secondDatePattern, "")
      .trim();
    const firstLineRemainder = statementBlock.firstLine
      .slice(dateMatch[0].length)
      .replace(secondDatePattern, "")
      .trim();
    const amountMatches = [...remainder.matchAll(amountPattern)];
    const rowAmountMatches = [...firstLineRemainder.matchAll(amountPattern)];
    if (amountMatches.length === 0 || rowAmountMatches.length === 0) {
      skippedDatedRows += 1;
      continue;
    }
    if (rowAmountMatches.length > 1) ambiguousAmounts += 1;

    // Tatra-style statements explicitly label a final Suma column. Other bank
    // layouts can put a running balance last, so retain first-amount behavior
    // unless the PDF itself confirms this column layout.
    const selectedAmount = usesFinalAmountColumn
      ? rowAmountMatches.at(-1) ?? amountMatches[0]
      : amountMatches[0];
    const parsedAmount = parseStatementAmount(selectedAmount[0], remainder);
    if (!parsedAmount || parsedAmount.amount === 0) {
      skippedDatedRows += 1;
      continue;
    }
    if (parsedAmount.inferred) inferredSigns += 1;

    const titleBeforeAmount = sanitizeDescription(
      remainder
        .slice(0, selectedAmount.index ?? remainder.length)
        .replace(amountPattern, ""),
    );
    const titleAfterAmount = sanitizeDescription(
      remainder
        .slice((selectedAmount.index ?? 0) + selectedAmount[0].length)
        .replace(amountPattern, ""),
    );
    const title = titleBeforeAmount || titleAfterAmount;
    if (!title) {
      skippedDatedRows += 1;
      continue;
    }

    if (!date.startsWith(statementMonth)) outsideMonth += 1;
    rows.push({
      amount: parsedAmount.amount,
      category: categorizeTransaction(remainder, parsedAmount.amount),
      date,
      status: "paid",
      title,
    });
  }

  const normalizedRows = rows.slice(0, 500);

  if (normalizedRows.length === 0) {
    throw new Error(
      "No transactions were detected. Use a text-based bank statement or export CSV instead.",
    );
  }

  const income = roundMoney(
    normalizedRows
      .filter((row) => row.amount > 0)
      .reduce((total, row) => total + row.amount, 0),
  );
  const expenses = roundMoney(Math.abs(
    normalizedRows
      .filter((row) => row.amount < 0)
      .reduce((total, row) => total + row.amount, 0),
  ));
  const warnings: string[] = [];

  if (ambiguousAmounts > 0) {
    warnings.push(
      `${ambiguousAmounts} row${ambiguousAmounts === 1 ? " has" : "s have"} multiple amount-like values. Orbit used the final Suma column.`,
    );
  }
  if (inferredSigns > 0) {
    warnings.push(
      `${inferredSigns} amount sign${inferredSigns === 1 ? " was" : "s were"} inferred from the description. Review income and expenses before importing.`,
    );
  }
  if (outsideMonth > 0) {
    warnings.push(
      `${outsideMonth} transaction${outsideMonth === 1 ? " is" : "s are"} outside ${statementMonth}; this can happen around statement boundaries.`,
    );
  }
  if (skippedDatedRows > 0) {
    warnings.push(
      `${skippedDatedRows} dated line${skippedDatedRows === 1 ? " was" : "s were"} ignored because no valid transaction amount was found.`,
    );
  }
  return {
    expenses,
    income,
    net: roundMoney(income - expenses),
    rows: normalizedRows,
    warnings,
  };
}

export function statementFingerprintPayload(
  statementMonth: string,
  rows: FinanceInput[],
) {
  return JSON.stringify({
    rows: rows.map(({ amount, category, date, title }) => ({
      amount: roundMoney(amount),
      category,
      date,
      title,
    })),
    statementMonth,
  });
}

function parseStatementDate(token: string, statementMonth: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    return isRealDate(token) ? token : null;
  }

  const parts = token.replace(/\.$/, "").split(/[./-]/).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const selectedYear = Number(statementMonth.slice(0, 4));
  const selectedMonth = Number(statementMonth.slice(5, 7));
  let year = parts[2] ? Number(parts[2]) : selectedYear;

  if (year < 100) year += 2000;
  if (!parts[2] && selectedMonth === 1 && month === 12) year -= 1;
  if (!parts[2] && selectedMonth === 12 && month === 1) year += 1;

  const isoDate = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return isRealDate(isoDate) ? isoDate : null;
}

function isRealDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseStatementAmount(token: string, context: string) {
  const compact = token
    .replace(/EUR|€/giu, "")
    .replace(/[\s'’]/g, "")
    .replaceAll("−", "-");
  const explicitNegative = compact.startsWith("-") || compact.endsWith("-");
  const explicitPositive = compact.startsWith("+") || compact.endsWith("+");
  const unsigned = compact.replace(/[+-]/g, "");
  const comma = unsigned.lastIndexOf(",");
  const dot = unsigned.lastIndexOf(".");
  const decimalIndex = Math.max(comma, dot);
  const integer = unsigned.slice(0, decimalIndex).replace(/[.,]/g, "");
  const decimal = unsigned.slice(decimalIndex + 1);
  const numeric = Number(`${integer}.${decimal}`);
  if (!Number.isFinite(numeric)) return null;

  let sign = -1;
  const inferred = !explicitNegative && !explicitPositive;
  if (explicitPositive) sign = 1;
  if (explicitNegative) sign = -1;

  if (inferred) {
    const normalizedContext = normalizeForMatching(context);
    const isIncome = incomeWords.some((word) => normalizedContext.includes(word));
    const isExpense = expenseWords.some((word) => normalizedContext.includes(word));

    // Bank rows can contain both a generic word such as "platba" and a more
    // specific direction such as "prijata platba". The specific income marker
    // must win when the PDF does not print an explicit plus sign.
    if (isIncome) sign = 1;
    else if (isExpense) sign = -1;
  }

  return { amount: roundMoney(numeric * sign), inferred };
}

function sanitizeDescription(value: string) {
  return value
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/giu, "Account ••••")
    .replace(/\b(?:\d[ -]?){12,19}\b/g, "Card ••••")
    .replace(/\b\d{10,}\b/g, "Reference ••••")
    .replace(/\b(?:EUR|€)\b/giu, "")
    .replace(/\s+/g, " ")
    .replace(/^[|:;,\-–—\s]+|[|:;,\-–—\s]+$/g, "")
    .trim()
    .slice(0, 200);
}

function categorizeTransaction(title: string, amount: number) {
  if (amount > 0) return "Income";
  const value = normalizeForMatching(title);
  const matches = (words: string[]) => words.some((word) => value.includes(word));

  if (matches(["fee", "poplatok"])) return "Bank fees";
  if (matches(["bankomat", "cash withdrawal", "vyber", "výber"])) return "Cash";
  if (matches(["odoslana platba", "transfer", "prevod"])) return "Transfers";
  if (matches(["direct debit", "inkaso", "poist", "insurance"])) return "Bills";
  if (matches(["gym", "fitness", "tennis", "sport"])) return "Fitness";
  if (matches(["billa", "fresh", "kaufland", "lidl", "potrav", "tesco", "grocery"])) return "Groceries";
  if (matches(["bolt", "bus", "omv", "shell", "slovnaft", "train", "uber", "zelezn", "železn"])) return "Transport";
  if (matches(["cafe", "coffee", "food", "pizza", "restaurant", "restaur", "wolt"])) return "Dining";
  if (matches(["electric", "energy", "gas", "internet", "mortgage", "najom", "nájom", "rent", "telekom", "voda"])) return "Housing";
  if (matches(["apple.com/bill", "google", "netflix", "spotify", "subscription"])) return "Subscriptions";
  if (matches(["amazon", "mall", "shop", "store", "zalando"])) return "Shopping";
  if (matches(["ap nakup pos", "card", "karta", "kartou", "payment", "platba", "pos purchase"])) {
    return "Card purchases";
  }
  return "Other";
}

function normalizeForMatching(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function isValidStatementMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
