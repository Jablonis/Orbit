import type { SupabaseClient } from "@supabase/supabase-js";

export type FinanceStatus = "paid" | "pending" | "scheduled";

export type FinanceTransaction = {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  status: FinanceStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type FinanceInput = Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">;

type DbFinanceTransaction = {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number | string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type ParsedFinanceCsv = {
  rows: FinanceInput[];
  errors: string[];
};

export const sampleFinanceCsv =
  "date,title,category,amount,status\n2026-07-01,Client retainer,Income,2450,paid\n2026-07-03,Gym membership,Fitness,-59,paid\n2026-07-08,Invoice pending,Income,780,pending\n";

function toFinanceStatus(value: string | null | undefined): FinanceStatus {
  return value === "pending" || value === "scheduled" ? value : "paid";
}

export function mapDbFinanceTransaction(
  transaction: DbFinanceTransaction,
): FinanceTransaction {
  return {
    id: transaction.id,
    date: transaction.date,
    title: transaction.title,
    category: transaction.category,
    amount: Number(transaction.amount),
    status: toFinanceStatus(transaction.status),
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
  };
}

export function toFinanceInsert(input: FinanceInput, userId: string) {
  return {
    user_id: userId,
    date: input.date,
    title: input.title,
    category: input.category,
    amount: input.amount,
    status: input.status,
  };
}

export async function getFinanceTransactions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("id,date,title,category,amount,status,created_at,updated_at")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((transaction) =>
    mapDbFinanceTransaction(transaction as DbFinanceTransaction),
  );
}

export function getFinanceSummary(transactions: FinanceTransaction[]) {
  const paid = transactions.filter((transaction) => transaction.status === "paid");
  const latestDate =
    transactions
      .map((transaction) => transaction.date)
      .sort()
      .at(-1) ?? new Date().toISOString().slice(0, 10);
  const monthKey = latestDate.slice(0, 7);
  const currentMonthPaid = paid.filter((transaction) =>
    transaction.date.startsWith(monthKey),
  );
  const income = currentMonthPaid
    .filter((transaction) => transaction.amount > 0)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = Math.abs(
    currentMonthPaid
      .filter((transaction) => transaction.amount < 0)
      .reduce((total, transaction) => total + transaction.amount, 0),
  );
  const availableBalance = paid.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );
  const monthlyCashflow = getMonthlyCashflow(paid);
  const categorySpend = getCategorySpend(currentMonthPaid);
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return {
    availableBalance,
    categorySpend,
    currentMonth: monthKey,
    expenses,
    income,
    monthlyCashflow,
    netCashflow: income - expenses,
    recentTransactions,
  };
}

function getMonthlyCashflow(transactions: FinanceTransaction[]) {
  const months = new Map<string, { month: string; income: number; expense: number }>();

  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    const current = months.get(month) ?? { month, income: 0, expense: 0 };

    if (transaction.amount > 0) {
      current.income += transaction.amount;
    } else {
      current.expense += Math.abs(transaction.amount);
    }

    months.set(month, current);
  }

  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
}

function getCategorySpend(transactions: FinanceTransaction[]) {
  const expenses = transactions.filter((transaction) => transaction.amount < 0);
  const total = expenses.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );
  const categories = new Map<string, number>();

  for (const transaction of expenses) {
    categories.set(
      transaction.category,
      (categories.get(transaction.category) ?? 0) + Math.abs(transaction.amount),
    );
  }

  return [...categories.entries()]
    .map(([label, amount]) => ({
      amount,
      label,
      value: total === 0 ? 0 : Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function parseFinanceCsv(csv: string): ParsedFinanceCsv {
  const lines = parseCsv(csv);
  const errors: string[] = [];
  const rows: FinanceInput[] = [];
  const [header, ...records] = lines.filter((line) =>
    line.some((cell) => cell.trim() !== ""),
  );

  if (!header) {
    return { rows, errors: ["CSV is empty."] };
  }

  const normalizedHeader = header.map((cell) => cell.trim().toLowerCase());
  const required = ["date", "title", "category", "amount"];

  for (const column of required) {
    if (!normalizedHeader.includes(column)) {
      errors.push(`Missing header: ${column}.`);
    }
  }

  if (errors.length > 0) {
    return { rows, errors };
  }

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const value = (column: string) =>
      (record[normalizedHeader.indexOf(column)] ?? "").trim();
    const date = value("date");
    const title = value("title");
    const category = value("category");
    const amount = Number(value("amount"));
    const status = toFinanceStatus(value("status"));

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Row ${rowNumber}: invalid date.`);
      return;
    }

    if (!title || !category) {
      errors.push(`Row ${rowNumber}: title and category are required.`);
      return;
    }

    if (!Number.isFinite(amount)) {
      errors.push(`Row ${rowNumber}: amount must be a number.`);
      return;
    }

    rows.push({ amount, category, date, status, title });
  });

  return { rows, errors };
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows;
}

export function transactionsToCsv(transactions: FinanceTransaction[]) {
  const escapeCell = (value: string | number) => {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  return [
    "date,title,category,amount,status",
    ...transactions.map((transaction) =>
      [
        transaction.date,
        transaction.title,
        transaction.category,
        transaction.amount,
        transaction.status,
      ]
        .map(escapeCell)
        .join(","),
    ),
  ].join("\n");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("sk-SK", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
