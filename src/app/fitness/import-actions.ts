"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { getExerciseName } from "@/lib/exercises";
import { getCatalogExercise, isCatalogId } from "@/lib/exercise-catalog";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import {
  IMPORT_ROW_LIMIT,
  describeImport,
  parseSetExport,
  type ImportPreview,
} from "@/lib/set-import";

/**
 * Reading a training history in, in two steps.
 *
 * Both of them parse the file. The alternative — parse once, hand the rows to
 * the browser, take them back on confirm — means trusting a client to return
 * what it was given, and a doctored round trip would write sets nobody
 * performed. Parsing twice costs milliseconds and removes the question.
 *
 * The catalogue the names are matched against is 900 kB, so the parsing
 * happens here in both directions and what crosses the wire is a summary.
 */

/** Everything the confirmation screen needs, and nothing that is a row. */
export type ImportSummary = {
  days: number;
  /** Matched exercises, most sets first — the "is this my training" check. */
  exercises: Array<{ count: number; name: string }>;
  firstDay: string;
  lastDay: string;
  rejections: Array<{ count: number; reason: string }>;
  sentence: string;
  sets: number;
  unmatched: Array<{ count: number; name: string }>;
};

export type ImportPreviewResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string };

export type ImportRunResult =
  | { ok: true; imported: number; sentence: string }
  | { ok: false; error: string };

/** A CSV bigger than this is not a training history, it is a mistake. */
const MAX_CSV_BYTES = 2_000_000;

/** How many rows of each list a screen can usefully show. */
const LIST_LIMIT = 12;

function summarize(preview: ImportPreview): ImportSummary {
  const counts = new Map<string, number>();
  for (const row of preview.rows) {
    counts.set(row.exerciseId, (counts.get(row.exerciseId) ?? 0) + 1);
  }
  return {
    days: preview.days,
    exercises: [...counts.entries()]
      .map(([id, count]) => ({ count, name: nameFor(id) }))
      .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1))
      .slice(0, LIST_LIMIT),
    firstDay: preview.firstDay,
    lastDay: preview.lastDay,
    rejections: preview.rejections.slice(0, LIST_LIMIT),
    sentence: describeImport(preview),
    sets: preview.rows.length,
    unmatched: preview.unmatched.slice(0, LIST_LIMIT),
  };
}

/** The curated name, the catalogue name, or the id — in that order. */
function nameFor(id: string) {
  if (isCatalogId(id)) return getCatalogExercise(id)?.name ?? id;
  return getExerciseName(id);
}

async function readFile(csv: string, timeZoneOf: () => Promise<string>) {
  if (typeof csv !== "string" || csv.trim().length === 0) {
    return { error: "Choose a CSV file first." as const, preview: null };
  }
  // Byte length, not character count: an accented exercise name is two bytes
  // and the limit here is about what has to be held in memory.
  if (new TextEncoder().encode(csv).length > MAX_CSV_BYTES) {
    return {
      error: "That file is over 2 MB. Export a shorter date range." as const,
      preview: null,
    };
  }
  const today = getDateInTimeZone(new Date(), await timeZoneOf());
  return { error: null, preview: parseSetExport(csv, today) };
}

export async function previewSetImportAction(
  csv: string,
): Promise<ImportPreviewResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const { error, preview } = await readFile(csv, async () => {
    const preferences = await getDashboardPreferences(supabase, user.id);
    return preferences.regional.timeZone;
  });
  if (error) return { ok: false, error };
  return { ok: true, summary: summarize(preview) };
}

export async function importSetsAction(csv: string): Promise<ImportRunResult> {
  const { supabase, user } = await getAuthenticatedUser();
  const { error, preview } = await readFile(csv, async () => {
    const preferences = await getDashboardPreferences(supabase, user.id);
    return preferences.regional.timeZone;
  });
  if (error) return { ok: false, error };

  if (preview.rows.length === 0) {
    return { ok: false, error: "Nothing in that file can be imported." };
  }

  const { error: rpcError } = await supabase.rpc("import_exercise_sets", {
    p_rows: preview.rows.slice(0, IMPORT_ROW_LIMIT).map((row) => ({
      exercise_id: row.exerciseId,
      performed_on: row.performedOn,
      reps: row.reps,
      set_index: row.setIndex,
      weight_kg: row.weightKg,
    })),
  });
  if (rpcError) {
    console.error("fitness: import failed", rpcError.code, rpcError.message);
    return {
      ok: false,
      error:
        rpcError.code === "PGRST202" || rpcError.code === "PGRST205"
          ? "The import migration has not been run yet."
          : "Those sets could not be imported.",
    };
  }

  revalidatePath("/");
  revalidatePath("/fitness");
  return {
    ok: true,
    imported: preview.rows.length,
    sentence: describeImport(preview),
  };
}
