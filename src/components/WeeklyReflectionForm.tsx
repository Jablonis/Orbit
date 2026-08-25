"use client";

import { useActionState } from "react";
import {
  type WeeklyReflectionActionState,
  saveWeeklyReflectionAction,
} from "@/app/actions";
import type { WeeklyReflection } from "@/lib/dashboard";

const initialState: WeeklyReflectionActionState = { message: "", ok: false };

export function WeeklyReflectionForm({
  reflection,
}: {
  reflection: WeeklyReflection;
}) {
  const [state, formAction, pending] = useActionState(
    saveWeeklyReflectionAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
    >
      <label className="grid gap-2">
        <span className="label-caps text-muted-foreground">What worked?</span>
        <textarea
          className="field-input min-h-20 py-3"
          defaultValue={reflection.whatWorked}
          maxLength={2000}
          name="whatWorked"
          placeholder="One thing worth repeating…"
        />
      </label>
      <label className="grid gap-2">
        <span className="label-caps text-muted-foreground">
          What changes next week?
        </span>
        <textarea
          className="field-input min-h-20 py-3"
          defaultValue={reflection.changeNextWeek}
          maxLength={2000}
          name="changeNextWeek"
          placeholder="One deliberate adjustment…"
        />
      </label>
      <button
        aria-busy={pending}
        className="h-11 rounded-xl bg-primary px-5 text-[13px] font-bold text-primary-foreground disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : "Save review"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-[13px] lg:col-span-3 ${
            state.ok
              ? "border-primary/25 bg-primary/10 text-fitness-ink"
              : "border-[var(--destructive)]/25 bg-destructive/10 text-destructive"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
