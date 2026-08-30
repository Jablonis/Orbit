import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeekdayId } from "@/lib/fitness";
import type { ExerciseSet } from "@/lib/training-block";

/**
 * Reading the programme.
 *
 * One query for the block and everything hanging off it, one for the sets in
 * the window the screen shows. Both throw on failure and are wrapped in
 * `settle()` at the call site, so a missing table costs Fitness a sentence
 * rather than the whole page.
 */

export type BlockExerciseRow = {
  exerciseId: string;
  position: number;
  repHigh: number;
  repLow: number;
  targetSets: number;
};

export type BlockSessionRow = {
  exercises: BlockExerciseRow[];
  id: string;
  label: string;
  slot: number;
  weekday: WeekdayId;
};

export type ActiveBlock = {
  blockIndex: number;
  id: string;
  sessions: BlockSessionRow[];
  splitId: string;
  startedOn: string;
  weeks: number;
};

type DbExercise = {
  exercise_id: string;
  position: number;
  rep_high: number;
  rep_low: number;
  target_sets: number;
};

type DbSession = {
  id: string;
  label: string;
  slot: number;
  training_block_exercises: DbExercise[] | null;
  weekday: string;
};

type DbBlock = {
  block_index: number;
  id: string;
  split_id: string;
  started_on: string;
  training_block_sessions: DbSession[] | null;
  weeks: number;
};

export async function getActiveTrainingBlock(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveBlock | null> {
  const { data, error } = await supabase
    .from("training_blocks")
    .select(
      "id,block_index,split_id,started_on,weeks,training_block_sessions(id,slot,weekday,label,training_block_exercises(exercise_id,position,target_sets,rep_low,rep_high))",
    )
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const block = data as DbBlock;
  return {
    blockIndex: block.block_index,
    id: block.id,
    sessions: (block.training_block_sessions ?? [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((session) => ({
        exercises: (session.training_block_exercises ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((exercise) => ({
            exerciseId: exercise.exercise_id,
            position: exercise.position,
            repHigh: exercise.rep_high,
            repLow: exercise.rep_low,
            targetSets: exercise.target_sets,
          })),
        id: session.id,
        label: session.label,
        slot: session.slot,
        weekday: session.weekday as WeekdayId,
      })),
    splitId: block.split_id,
    startedOn: block.started_on,
    weeks: block.weeks,
  };
}

export async function getExerciseSets(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string,
): Promise<ExerciseSet[]> {
  const { data, error } = await supabase
    .from("exercise_sets")
    .select("exercise_id,performed_on,reps,set_index,weight_kg")
    .eq("user_id", userId)
    .gte("performed_on", from)
    .lte("performed_on", to)
    .order("performed_on", { ascending: true })
    .order("set_index", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    exerciseId: row.exercise_id as string,
    performedOn: row.performed_on as string,
    reps: Number(row.reps),
    setIndex: Number(row.set_index),
    weightKg: Number(row.weight_kg),
  }));
}
