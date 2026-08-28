"use client";

import { useActionState, useState } from "react";
import { Pip } from "@/components/brand/Pip";
import { PIP_KITS, getPanelPip } from "@/lib/mascot";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { RepeatPicker } from "@/components/RepeatPicker";
import { TintPanel } from "@/components/ui/tint-panel";
import type { Habit, getHabitHold } from "@/lib/habits";
import { habitHoldSentence, isHabitDueOn } from "@/lib/habits";
import { repeatSentence } from "@/lib/routines";
import {
  archiveHabitAction,
  idleHabitState,
  saveHabitAction,
  toggleHabitAction,
} from "./actions";

type Hold = ReturnType<typeof getHabitHold>;

const secondary =
  "ui-button ui-button--secondary h-10 min-h-10 px-3 text-[12px]";
const primary =
  "ui-button ui-button--primary h-11 min-h-11 px-4 text-[13px]";

/**
 * The third pillar, and the only one Orbit cannot write for you.
 *
 * Tasks are the work and training is the body. What else a day is made of is
 * whatever this person has decided to keep doing, so the page is mostly one
 * question — what, and on which days — and then a list that is ticked.
 */
export function HabitsClient({
  doneToday,
  habits,
  holds,
  timeZone,
  today,
  trouble,
}: {
  doneToday: string[];
  habits: Habit[];
  holds: Record<string, Hold>;
  timeZone: string;
  today: string;
  /** Why the list could not be read, in the database's own words. */
  trouble?: string;
}) {
  const [state, save] = useActionState(saveHabitAction, idleHabitState);
  const [archiveState, archive] = useActionState(
    archiveHabitAction,
    idleHabitState,
  );
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [editing, setEditing] = useState<Habit | null>(null);
  const done = new Set(doneToday);
  const dueToday = habits.filter((habit) => isHabitDueOn(habit, today, timeZone));
  const keptToday = dueToday.filter((habit) => done.has(habit.id)).length;
  const todayPip = getPanelPip(
    keptToday,
    dueToday.length,
    "habits",
    PIP_KITS.habits,
  );
  const message = trouble || state.message || archiveState.message;
  const failed = Boolean(trouble) || !state.ok || !archiveState.ok;

  const startEdit = (habit: Habit) => {
    setEditing(habit);
    setDays(habit.repeatDays);
  };
  const stopEdit = () => {
    setEditing(null);
    setDays([1, 2, 3, 4, 5, 6, 0]);
  };

  return (
    <div className="page-container flex flex-col gap-8 py-7 md:py-10">
      <header className="settle-in flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="label-caps text-plum">Your own pillar</p>
          <h1 className="mt-2 text-[30px] font-bold leading-9 tracking-[-0.03em] sm:text-[34px]">
            Habits
          </h1>
          <p className="mt-2 max-w-prose text-[14px] leading-6 text-muted-foreground">
            Tasks are the work and training is the body. This is whatever else
            you have decided to keep doing — and it counts towards the day on
            the days you asked for it.
          </p>
        </div>
        {dueToday.length > 0 ? (
          <div className="flex items-center gap-3">
            <Pip
              burn={todayPip.burn}
              className="h-9 w-auto"
              kit={todayPip.kit}
              mood={todayPip.mood}
              seed={11}
              size={36}
              title={todayPip.title}
            />
            <p className="metric-value text-[15px] font-bold">
              {keptToday}/{dueToday.length} today
            </p>
          </div>
        ) : null}
      </header>

      {message ? (
        <p
          className={`text-[13px] font-semibold ${
            failed ? "text-destructive" : "text-muted-foreground"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}

      {/* Today, ticked. A habit that is not asked for today is not shown here
          at all: a Sunday should not look failed for a weekday habit. */}
      {dueToday.length > 0 ? (
        <section aria-labelledby="today-heading" className="flex flex-col gap-3">
          <h2 className="text-[16px] font-bold tracking-[-0.02em]" id="today-heading">
            Asked for today
          </h2>
          <ul className="flex flex-col gap-2">
            {dueToday.map((habit) => {
              const kept = done.has(habit.id);
              return (
                <li key={habit.id}>
                  <form action={toggleHabitAction}>
                    <input name="id" type="hidden" value={habit.id} />
                    <input
                      name="done"
                      type="hidden"
                      value={kept ? "false" : "true"}
                    />
                    <PendingSubmitButton
                      className={`press-row flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                        kept
                          ? "bg-plum-tint text-foreground"
                          : "bg-card text-foreground shadow-[var(--shadow-card)] hover:bg-muted"
                      }`}
                      pendingLabel="Saving…"
                    >
                      <span
                        aria-hidden="true"
                        className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                          kept
                            ? "border-plum bg-plum text-white"
                            : "border-input"
                        }`}
                      >
                        {kept ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">
                          {habit.name}
                        </span>
                        <span className="block text-[12px] text-muted-foreground">
                          {habitHoldSentence(
                            holds[habit.id] ?? { done: 0, due: 0, percent: 0 },
                          )}
                        </span>
                      </span>
                    </PendingSubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* The setup. One name, one week. */}
      <TintPanel
        className="flex flex-col gap-4"
        padding="sm"
        system={editing ? "plum" : "neutral"}
      >
        <h2 className="text-[16px] font-bold tracking-[-0.02em]">
          {editing ? `Edit “${editing.name}”` : "Add a habit"}
        </h2>
        <form action={save} className="flex flex-col gap-4" key={editing?.id ?? "new"}>
          {editing ? (
            <input name="id" type="hidden" value={editing.id} />
          ) : null}
          <label className="flex flex-col gap-2">
            <span className="label-caps text-muted-foreground">What is it</span>
            <input
              className="ui-field h-11 rounded-xl px-3 text-[14px]"
              defaultValue={editing?.name ?? ""}
              maxLength={60}
              name="name"
              placeholder="Read for twenty minutes"
              required
              type="text"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="label-caps text-muted-foreground">
              Which days
            </span>
            <RepeatPicker onChange={setDays} value={days} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PendingSubmitButton className={primary} pendingLabel="Saving…">
              {editing ? "Save habit" : "Add habit"}
            </PendingSubmitButton>
            {editing ? (
              <button className={secondary} onClick={stopEdit} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </TintPanel>

      {/* Everything written down, whether or not it is asked for today. */}
      <section aria-labelledby="all-heading" className="flex flex-col gap-3">
        <h2 className="text-[16px] font-bold tracking-[-0.02em]" id="all-heading">
          Your habits
        </h2>
        {habits.length === 0 ? (
          <p className="text-[14px] leading-6 text-muted-foreground">
            Nothing yet. One is a good number to start with — the third pillar
            only works if it is something you would have done anyway.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {habits.map((habit) => {
              const hold = holds[habit.id] ?? { done: 0, due: 0, percent: 0 };
              return (
                <li
                  className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center"
                  key={habit.id}
                >
                  <div className="min-w-0 sm:flex-1">
                    <p className="truncate text-[15px] font-semibold">
                      {habit.name}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {repeatSentence(habit.repeatDays) || "No days chosen"} ·{" "}
                      {habitHoldSentence(hold)}
                    </p>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-muted sm:w-28"
                  >
                    <div
                      className="h-full rounded-full bg-plum"
                      style={{ width: `${hold.percent}%` }}
                    />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className={secondary}
                      onClick={() => startEdit(habit)}
                      type="button"
                    >
                      Edit
                    </button>
                    <form action={archive}>
                      <input name="id" type="hidden" value={habit.id} />
                      <PendingSubmitButton
                        className={secondary}
                        pendingLabel="Removing…"
                      >
                        Remove
                      </PendingSubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
