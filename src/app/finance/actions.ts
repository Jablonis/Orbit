"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseFinanceCsv, toFinanceInsert } from "@/lib/finance";
import { startOperation } from "@/lib/operation-log.server";

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
