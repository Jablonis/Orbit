"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type FinanceStatus,
  parseFinanceCsv,
  toFinanceInsert,
} from "@/lib/finance";
import { startOperation } from "@/lib/operation-log.server";

export type ImportState = {
  message: string;
  errors: string[];
};

export type FinanceClearResult =
  | { ok: true; archivedAt: string }
  | { ok: false; error: string };

export type FinanceTransactionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveFinanceTransactionAction(
  formData: FormData,
): Promise<FinanceTransactionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const category = String(formData.get("category") ?? "").trim().slice(0, 80);
  const amount = Number(formData.get("amount"));
  const rawStatus = String(formData.get("status") ?? "paid");
  const status: FinanceStatus =
    rawStatus === "pending" || rawStatus === "scheduled" ? rawStatus : "paid";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title || !category || !Number.isFinite(amount)) {
    return { ok: false, error: "Add a valid date, title, category, and amount." };
  }

  const input = { amount, category, date, status, title };
  const query = id
    ? supabase
        .from("finance_transactions")
        .update(toFinanceInsert(input, user.id))
        .eq("id", id)
        .eq("user_id", user.id)
    : supabase.from("finance_transactions").insert(toFinanceInsert(input, user.id));
  const { error } = await query;

  if (error) return { ok: false, error: "The transaction could not be saved." };
  revalidatePath("/");
  revalidatePath("/finance");
  return { ok: true };
}

export async function archiveFinanceTransactionAction(
  transactionId: string,
): Promise<FinanceTransactionResult> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!transactionId) return { ok: false, error: "Choose a transaction." };
  const { error } = await supabase
    .from("finance_transactions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "The transaction could not be archived." };
  revalidatePath("/");
  revalidatePath("/finance");
  return { ok: true };
}

export async function importFinanceCsvAction(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { supabase, user } = await getAuthenticatedUser();
  const file = formData.get("csv");

  if (!(file instanceof File) || file.size === 0) {
    return { errors: ["Choose a CSV file."], message: "" };
  }
  if (file.size > 1024 * 1024) {
    return { errors: ["CSV files are limited to 1 MB."], message: "" };
  }
  const csvType = file.type === "text/csv" || file.type === "application/vnd.ms-excel";
  if (!csvType || !file.name.toLocaleLowerCase().endsWith(".csv")) {
    return { errors: ["Only CSV finance exports are accepted."], message: "" };
  }

  const parsed = parseFinanceCsv(await file.text());

  if (parsed.rows.length > 0) {
    const { error } = await supabase
      .from("finance_transactions")
      .insert(parsed.rows.map((row) => toFinanceInsert(row, user.id)));
    if (error) {
      return { errors: ["The valid rows could not be imported."], message: "" };
    }
  }

  revalidatePath("/");
  revalidatePath("/finance");

  return {
    errors: parsed.errors.slice(0, 5),
    message: `Imported ${parsed.rows.length} valid row${parsed.rows.length === 1 ? "" : "s"}.`,
  };
}

export async function clearFinanceDataAction(): Promise<FinanceClearResult> {
  const { supabase } = await getAuthenticatedUser();
  const operation = startOperation("finance.archive");
  const { data: archivedAt, error } = await supabase.rpc("archive_finance_data");
  if (error || typeof archivedAt !== "string") {
    operation.finish("database_error", { status: 500 });
    return { ok: false, error: "Finance data could not be cleared." };
  }

  revalidatePath("/");
  revalidatePath("/finance");
  operation.finish("success", { status: 200 });
  return { ok: true, archivedAt };
}

export async function restoreFinanceDataAction(
  archivedAt: string,
): Promise<FinanceClearResult> {
  const operation = startOperation("finance.restore");
  const timestamp = Date.parse(archivedAt);
  if (!Number.isFinite(timestamp)) {
    operation.finish("invalid_archive_token", { status: 400 });
    return { ok: false, error: "Finance data could not be restored." };
  }

  const { supabase } = await getAuthenticatedUser();
  const { data: restored, error } = await supabase.rpc("restore_finance_data", {
    p_archived_at: archivedAt,
  });
  if (error || restored !== true) {
    operation.finish("database_error", { status: 500 });
    return { ok: false, error: "Finance data could not be restored." };
  }

  revalidatePath("/");
  revalidatePath("/finance");
  operation.finish("success", { status: 200 });
  return { ok: true, archivedAt };
}
