export const bankStatementCategories = [
  "Bank fees",
  "Bills",
  "Card purchases",
  "Cash",
  "Dining",
  "Fitness",
  "Groceries",
  "Housing",
  "Income",
  "Other",
  "Shopping",
  "Subscriptions",
  "Transfers",
  "Transport",
] as const;

export type BankStatementCategory = typeof bankStatementCategories[number];
