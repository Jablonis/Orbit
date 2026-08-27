"use client";

import { useRef, useState, useTransition } from "react";
import { Pip } from "@/components/brand/Pip";
import { RepeatPicker } from "@/components/RepeatPicker";
import { DEFAULT_ROUTINE_KIT, ROUTINE_KIT } from "@/lib/routine-kit";
import { describeRepeat } from "@/lib/routines";
import { addRoutineKitAction } from "@/app/tasks/actions";

type Row = {
  days: number[];
  from: string;
  id: string;
  note: string;
  on: boolean;
  title: string;
  to: string;
};

function seed(): Row[] {
  return ROUTINE_KIT.map((item) => ({
    days: item.days,
    from: item.from,
    id: item.id,
    note: item.note,
    on: DEFAULT_ROUTINE_KIT.includes(item.id),
    title: item.title,
    to: item.to,
  }));
}

/**
 * The one-time setup.
 *
 * A week is mostly the same week, so this offers the shape of an ordinary one
 * — the morning, the working block, the training, the evening. It is a
 * starting point and not a menu: every row's days, times and name can be
 * changed before it is written, and a row of your own can be added, because
 * everybody has one thing nobody else has.
 *
 * Rows open when they are chosen. Seven rows of open controls is a form nobody
 * reads; seven lines of "Every day · 06:30–07:00" is a decision anyone can make
 * in five seconds.
 */
export function RoutineSetup({ hasRoutines }: { hasRoutines: boolean }) {
  const [rows, setRows] = useState<Row[]>(seed);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const lastTitle = useRef<HTMLInputElement>(null);

  const chosen = rows.filter((row) => row.on);
  const edit = (id: string, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );

  const addOwn = () => {
    const id = `own-${rows.length}-${rows.reduce((total, row) => total + row.title.length, 0)}`;
    setRows((current) => [
      ...current,
      { days: [1, 2, 3, 4, 5], from: "18:00", id, note: "", on: true, title: "", to: "18:30" },
    ]);
    // The row is useless without a name, so ask for one immediately.
    window.requestAnimationFrame(() => lastTitle.current?.focus());
  };

  const add = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await addRoutineKitAction(
        chosen.map((row) => ({
          days: row.days,
          from: row.from,
          note: row.note,
          title: row.title,
          to: row.to,
        })),
      );
      setNotice(
        result.ok
          ? {
              error: false,
              text:
                result.added > 0
                  ? `${result.added} routine${result.added === 1 ? "" : "s"} added. They come back on their own days now.`
                  : "You already have those.",
            }
          : { error: true, text: result.error },
      );
      if (result.ok && result.added > 0) setRows(seed());
    });
  };

  return (
    <details
      className="settle-in overflow-hidden rounded-2xl border border-border bg-card"
      open={!hasRoutines}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
        <Pip burn={0.3} className="h-9 w-auto shrink-0" mood="grounded" seed={12} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">
            {hasRoutines ? "Add more routines" : "Set up your week once"}
          </span>
          <span className="block text-[12px] text-muted-foreground">
            Things that come back on their own days, so you stop typing them in.
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-[12px] text-muted-foreground">
          {chosen.length} picked
        </span>
      </summary>

      <div className="border-t border-border p-4">
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li key={row.id}>
              <div
                className={`rounded-xl border transition-colors ${
                  row.on ? "border-primary/40 bg-primary/5" : "border-input bg-secondary"
                }`}
              >
                <div className="flex min-h-12 items-center gap-3 p-3">
                  <input
                    aria-label={`Include ${row.title || "this routine"}`}
                    checked={row.on}
                    className="[accent-color:var(--primary)]"
                    onChange={(event) => edit(row.id, { on: event.target.checked })}
                    type="checkbox"
                  />
                  {row.on ? (
                    <input
                      aria-label="Routine name"
                      className="field-input h-10 min-w-0 flex-1 text-[14px] font-semibold"
                      maxLength={200}
                      onChange={(event) => edit(row.id, { title: event.target.value })}
                      placeholder="What comes back?"
                      ref={index === rows.length - 1 ? lastTitle : undefined}
                      value={row.title}
                    />
                  ) : (
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => edit(row.id, { on: true })}
                      type="button"
                    >
                      <span className="block truncate text-[14px] font-semibold">
                        {row.title || "Something of your own"}
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {describeRepeat(row.days) || "No days yet"} · {row.from}–{row.to}
                      </span>
                    </button>
                  )}
                </div>

                {row.on ? (
                  <div className="flex flex-col gap-3 border-t border-border/60 px-3 pb-3 pt-3">
                    <RepeatPicker
                      compact
                      onChange={(days) => edit(row.id, { days })}
                      value={row.days}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        From
                        <input
                          className="field-input h-10 w-[7.5rem]"
                          onChange={(event) => edit(row.id, { from: event.target.value })}
                          type="time"
                          value={row.from}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        To
                        <input
                          className="field-input h-10 w-[7.5rem]"
                          onChange={(event) => edit(row.id, { to: event.target.value })}
                          type="time"
                          value={row.to}
                        />
                      </label>
                      <span className="text-[12px] text-muted-foreground">
                        {describeRepeat(row.days) || "Pick a day"}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="min-h-11 rounded-xl bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
            disabled={pending || chosen.length === 0}
            onClick={add}
            type="button"
          >
            {pending
              ? "Adding…"
              : `Add ${chosen.length} routine${chosen.length === 1 ? "" : "s"}`}
          </button>
          <button
            className="min-h-11 rounded-xl border border-input px-4 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            onClick={addOwn}
            type="button"
          >
            Add your own
          </button>
          {notice ? (
            <span
              aria-live="polite"
              className={`text-[12px] ${notice.error ? "text-destructive" : "text-muted-foreground"}`}
            >
              {notice.text}
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
