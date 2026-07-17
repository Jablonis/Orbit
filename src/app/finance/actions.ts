"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseFinanceCsv, toFinanceInsert } from "@/lib/finance";

export type ImportState = {
  message: string;
  errors: string[];
};

export type FinanceClearResult =
  | { ok: true; archivedAt: string }
  | { ok: false; error: string };

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
  const { supabase, user } = await getAuthenticatedUser();
  const archivedAt = new Date().toISOString();
  const { error } = await supabase
    .from("finance_transactions")
    .update({ archived_at: archivedAt })
    .eq("user_id", user.id)
    .is("archived_at", null);
  if (error) return { ok: false, error: "Finance data could not be cleared." };

  const { error: statementError } = await supabase
    .from("finance_statement_imports")
    .update({ archived_at: archivedAt })
    .eq("user_id", user.id)
    .is("archived_at", null);
  if (statementError) {
    await supabase
      .from("finance_transactions")
      .update({ archived_at: null })
      .eq("user_id", user.id)
      .eq("archived_at", archivedAt);
    return { ok: false, error: "Finance data could not be cleared." };
  }

  revalidatePath("/");
  revalidatePath("/finance");
  return { ok: true, archivedAt };
}

export async function restoreFinanceDataAction(
  archivedAt: string,
): Promise<FinanceClearResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("finance_transactions")
    .update({ archived_at: null })
    .eq("user_id", user.id)
    .eq("archived_at", archivedAt);
  if (error) return { ok: false, error: "Finance data could not be restored." };

  const { error: statementError } = await supabase
    .from("finance_statement_imports")
    .update({ archived_at: null })
    .eq("user_id", user.id)
    .eq("archived_at", archivedAt);
  if (statementError) return { ok: false, error: "Finance statements could not be restored." };

  revalidatePath("/");
  revalidatePath("/finance");
  return { ok: true, archivedAt };
}
