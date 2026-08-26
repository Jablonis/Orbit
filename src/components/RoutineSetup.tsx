"use client";

import { useState, useTransition } from "react";
import { Pip } from "@/components/brand/Pip";
import { DEFAULT_ROUTINE_KIT, ROUTINE_KIT } from "@/lib/routine-kit";
import { describeRepeat } from "@/lib/routines";
import { addRoutineKitAction } from "@/app/tasks/actions";

/**
 * The one-time setup.
 *
 * A week is mostly the same week. This offers that shape — the morning, the
 * working block, the training, the evening — so the first day in Orbit is a
 * choice about which of them are true rather than twenty minutes of typing.
 * Everything it writes is an ordinary task afterwards: editable, skippable,
 * archivable.
 */
export function RoutineSetup({ hasRoutines }: { hasRoutines: boolean }) {
  const [chosen, setChosen] = useState<string[]>(DEFAULT_ROUTINE_KIT);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await addRoutineKitAction(chosen);
      setNotice(
        result.ok
          ? result.added > 0
            ? `${result.added} routine${result.added === 1 ? "" : "s"} added. They come back on their own days now.`
            : "You already have those."
          : result.error,
      );
    });
  };

  return (
    <details
      className="settle-in rounded-xl border border-border bg-card/70 p-4"
      open={!hasRoutines}
    >
      <summary className="cursor-pointer text-[13px] font-semibold">
        {hasRoutines ? "Add more routines" : "Set up your week once"}
      </summary>
      <div className="mt-3 flex items-start gap-3">
        <Pip burn={0.3} className="shrink-0" mood="grounded" seed={12} size={44} />
        <p className="max-w-[62ch] text-[13px] leading-5 text-muted-foreground">
          Pick the parts of an ordinary week that are actually yours. They come
          back on their own days, are ticked off per day, and can be edited or
          archived like any other task.
        </p>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {ROUTINE_KIT.map((item) => {
          const on = chosen.includes(item.id);
          return (
            <li key={item.id}>
              <label
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  on ? "border-primary bg-primary/10" : "border-input bg-secondary"
                }`}
              >
                <input
                  checked={on}
                  className="mt-1 [accent-color:var(--primary)]"
                  onChange={(event) =>
                    setChosen((current) =>
                      event.target.checked
                        ? [...current, item.id]
                        : current.filter((id) => id !== item.id),
                    )
                  }
                  type="checkbox"
                />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {describeRepeat(item.days)} · {item.from}–{item.to}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="min-h-11 rounded-xl bg-primary px-4 text-[13px] font-bold text-primary-foreground disabled:opacity-60"
          disabled={pending || chosen.length === 0}
          onClick={add}
          type="button"
        >
          {pending ? "Adding…" : `Add ${chosen.length} routine${chosen.length === 1 ? "" : "s"}`}
        </button>
        {notice ? (
          <span aria-live="polite" className="text-[12px] text-muted-foreground">
            {notice}
          </span>
        ) : null}
      </div>
    </details>
  );
}
