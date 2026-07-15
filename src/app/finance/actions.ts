"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { parseFinanceCsv, toFinanceInsert } from "@/lib/finance";

export type ImportState = {
  message: string;
  errors: string[];
};

export async function importFinanceCsvAction(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { supabase, user } = await getAuthenticatedUser();
  const file = formData.get("csv");

  if (!(file instanceof File) || file.size === 0) {
    return { errors: ["Choose a CSV file."], message: "" };
  }

  const parsed = parseFinanceCsv(await file.text());

  if (parsed.rows.length > 0) {
    const { error } = await supabase
      .from("finance_transactions")
      .insert(parsed.rows.map((row) => toFinanceInsert(row, user.id)));
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/finance");

  return {
    errors: parsed.errors.slice(0, 5),
    message: `Imported ${parsed.rows.length} valid row${parsed.rows.length === 1 ? "" : "s"}.`,
  };
}

export async function clearFinanceDataAction() {
  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/finance");
}
