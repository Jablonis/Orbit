"use client";

import { useState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { MuscleGroup } from "@/lib/exercises";
import type { WeekdayId } from "@/lib/fitness";
import { weekdayMeta } from "@/lib/fitness";
import { MuscleCoverageGrid } from "@/components/fitness/MuscleCoverageGrid";
import {
  archiveTrainingBlockAction,
  startTrainingBlockAction,
} from "@/app/fitness/actions";

export type ProgrammeExercise = {
  name: string;
  repHigh: number;
  repLow: number;
  targetSets: number;
};

export type ProgrammeSession = {
  exercises: ProgrammeExercise[];
  label: string;
  weekday: WeekdayId;
};

export type ProgrammeView = {
  blockIndex: number;
  coverage: Record<MuscleGroup, number>;
  sessions: ProgrammeSession[];
  splitName: string;
};

export type PlanChange = {
  from: string;
  to: string;
  weekday: WeekdayId;
};

/**
 * The programme.
 *
 * Six weeks of the same sessions, and the one number that matters on top:
 * which week you are in. Everything below it is the prescription, unchanged
 * for the whole block on purpose — comparing week six to week one is the point
 * of the thing, and a programme that quietly reshuffles itself cannot be
 * compared to anything.
 *
 * Starting a block rewrites which days are training days, so the confirmation
 * names every day that changes, before it changes. Silently rearranging
 * someone's week is the one move here that would cost trust for good.
 */
export function TrainingBlockPanel({
  active,
  next,
  planChange,
  reason,
  trouble,
  week,
  weeks,
}: {
  active: ProgrammeView | null;
  next: ProgrammeView | null;
  planChange: PlanChange[];
  reason: string | null;
  trouble: string[];
  week: number;
  weeks: number;
}) {
  const [notice, setNotice] = useState("");
  const finished = active !== null && week > weeks;

  return (
    <section className="flex flex-col gap-4">
      {trouble.length > 0 ? (
        <p className="rounded-2xl bg-card p-4 text-[13px] leading-5 text-muted-foreground shadow-[var(--shadow-card)]">
          Some of the programme could not be loaded: {trouble.join(" · ")}
        </p>
      ) : null}

      {active ? (
        <article className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="label-caps text-muted-foreground">
              Block {active.blockIndex} · {active.splitName}
            </p>
            <p className="metric-value text-[13px] font-bold tabular-nums">
              {finished ? "Finished" : `Week ${week}`}
              <span className="text-muted-foreground">
                {finished ? "" : `/${weeks}`}
              </span>
            </p>
          </div>

          <ol className="mt-3 grid grid-cols-6 gap-1.5" aria-label="Weeks">
            {Array.from({ length: weeks }, (_, index) => index + 1).map(
              (number) => {
                const done = number < week;
                const current = number === week;
                return (
                  <li
                    className={`flex h-8 items-center justify-center rounded-lg border text-[11px] font-bold tabular-nums ${
                      current
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                          ? "border-[var(--hairline)] bg-[var(--wash)] text-muted-foreground"
                          : "border-[var(--hairline)] text-muted-foreground"
                    }`}
                    key={number}
                  >
                    {number}
                    <span className="sr-only">
                      {current ? " (this week)" : done ? " (done)" : ""}
                    </span>
                  </li>
                );
              },
            )}
          </ol>

          <div className="mt-4">
            <MuscleCoverageGrid coverage={active.coverage} />
          </div>
        </article>
      ) : null}

      {active
        ? active.sessions.map((session) => (
            <article
              className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
              key={`${session.weekday}-${session.label}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[15px] font-semibold">{session.label}</p>
                <p className="label-caps text-muted-foreground">
                  {weekdayMeta[session.weekday].label}
                </p>
              </div>
              <ol className="mt-3 flex flex-col gap-1.5">
                {session.exercises.map((exercise, index) => (
                  <li
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-[var(--hairline)] pt-1.5 first:border-0 first:pt-0"
                    key={`${exercise.name}-${index}`}
                  >
                    <span className="min-w-0 text-[14px]">{exercise.name}</span>
                    <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
                      {exercise.targetSets} × {exercise.repLow}–
                      {exercise.repHigh}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          ))
        : null}

      {reason ? (
        <article className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-[15px] font-semibold">No programme yet</p>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
            {reason}
          </p>
        </article>
      ) : null}

      {next && !reason ? (
        <article className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-[15px] font-semibold">
            {active ? `Block ${next.blockIndex}` : "Build my programme"}
          </p>
          <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
            {active
              ? finished
                ? "This block has run its six weeks. The next one keeps the rule and changes the shape."
                : "You can start the next block early. The one running now ends when you do."
              : "Six weeks of the same sessions, built from your setup, with every muscle group trained at least twice a week."}
          </p>

          {planChange.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1">
              {planChange.map((change) => (
                <li
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                  key={change.weekday}
                >
                  <span className="text-muted-foreground">
                    {weekdayMeta[change.weekday].label}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {change.from} → {change.to}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Your training days do not change.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <ConfirmDialog
              confirmLabel={active ? "Start the next block" : "Start"}
              description={
                planChange.length > 0
                  ? `This rewrites your weekly plan: ${planChange
                      .map(
                        (change) =>
                          `${weekdayMeta[change.weekday].label} becomes ${change.to}`,
                      )
                      .join(", ")}. Sessions you have already logged stay exactly where they are.`
                  : "Your training days stay as they are. Sessions you have already logged stay exactly where they are."
              }
              onConfirm={startTrainingBlockAction}
              onSuccess={() => setNotice("Programme started.")}
              title={active ? "Start block " + next.blockIndex + "?" : "Build the programme?"}
              triggerClassName="min-h-11 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
              triggerLabel={active ? "Start next block" : "Build my programme"}
            />
            {active ? (
              <ConfirmDialog
                confirmLabel="End the programme"
                description="The block stops here. Every set you logged under it stays in your history, and your weekly plan is left exactly as it is."
                onConfirm={archiveTrainingBlockAction}
                onSuccess={() => setNotice("Programme ended.")}
                title="End this programme?"
                triggerClassName="min-h-11 rounded-xl border border-[var(--hairline)] bg-muted px-4 text-[13px] font-semibold text-muted-foreground"
                triggerLabel="End programme"
              />
            ) : null}
          </div>
        </article>
      ) : null}

      {notice ? <ActionToast message={notice} tone="success" /> : null}
    </section>
  );
}
