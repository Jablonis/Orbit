"use client";

import { useState, useTransition } from "react";
import { ActionToast } from "@/components/ActionToast";
import type { WeekdayId } from "@/lib/fitness";
import { logExerciseSetsAction } from "@/app/fitness/actions";

export type LoggedSet = {
  reps: number | null;
  weightKg: number | null;
};

export type SessionExercise = {
  exerciseId: string;
  /** "17 Aug · 8, 8, 7 @ 60 kg", or empty the first time. */
  lastLine: string;
  name: string;
  repHigh: number;
  repLow: number;
  /** The suggestion, as a sentence. Never typed into the inputs. */
  targetNote: string;
  targetSets: number;
  sets: LoggedSet[];
};

export type BlockSessionLogProps = {
  blockId: string;
  exercises: SessionExercise[];
  label: string;
  weekday: WeekdayId;
};

/**
 * Logging a set.
 *
 * The numbers are the point of the whole programme, so this is the least
 * ceremonious thing on the page: the prescription, the boxes, and last time
 * underneath. Two interactions per set — type the reps, type the kilos — and
 * one Save for the exercise.
 *
 * The suggestion sits beside the inputs and never inside them. Orbit does not
 * decide what anyone lifts; it remembers what they lifted and says what one
 * small step forward would look like.
 */
export function BlockSessionLog({
  blockId,
  exercises,
  label,
  weekday,
}: BlockSessionLogProps) {
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mt-6 border-t border-[var(--hairline)] pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold">{label}</p>
        <p className="label-caps text-muted-foreground">Today’s prescription</p>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {exercises.map((exercise) => (
          <form
            action={(formData: FormData) => {
              startTransition(async () => {
                const result = await logExerciseSetsAction(formData);
                setNotice(
                  result.ok
                    ? { text: `${exercise.name} saved.`, tone: "success" }
                    : { text: result.error, tone: "error" },
                );
              });
            }}
            className="rounded-xl border border-[var(--hairline)] p-3"
            key={exercise.exerciseId}
          >
            <input name="blockId" type="hidden" value={blockId} />
            <input name="exerciseId" type="hidden" value={exercise.exerciseId} />
            <input name="weekday" type="hidden" value={weekday} />

            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[14px] font-semibold">{exercise.name}</p>
              <p className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                {exercise.targetSets} × {exercise.repLow}–{exercise.repHigh}
              </p>
            </div>
            {exercise.lastLine ? (
              <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
                Last time · {exercise.lastLine}
              </p>
            ) : null}
            <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
              {exercise.targetNote}
            </p>

            <ol className="mt-3 flex flex-col gap-2">
              {exercise.sets.map((set, index) => {
                const number = index + 1;
                return (
                  <li className="flex items-center gap-2" key={number}>
                    <span className="w-12 shrink-0 text-[12px] font-semibold text-muted-foreground">
                      Set {number}
                    </span>
                    <label className="flex-1">
                      <span className="sr-only">
                        {exercise.name} set {number} reps
                      </span>
                      <input
                        className="field-input tabular-nums"
                        defaultValue={set.reps ?? ""}
                        inputMode="numeric"
                        max={200}
                        min={1}
                        name={`reps_${number}`}
                        placeholder="reps"
                        step={1}
                        type="number"
                      />
                    </label>
                    <label className="flex-1">
                      <span className="sr-only">
                        {exercise.name} set {number} kilograms
                      </span>
                      <input
                        className="field-input tabular-nums"
                        defaultValue={set.weightKg ?? ""}
                        inputMode="decimal"
                        max={500}
                        min={0}
                        name={`kg_${number}`}
                        placeholder="kg"
                        step={0.5}
                        type="number"
                      />
                    </label>
                  </li>
                );
              })}
            </ol>

            <button
              className="mt-3 h-11 w-full rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto"
              disabled={pending}
              type="submit"
            >
              Save<span className="sr-only"> {exercise.name}</span>
            </button>
          </form>
        ))}
      </div>

      {notice ? <ActionToast message={notice.text} tone={notice.tone} /> : null}
    </section>
  );
}
