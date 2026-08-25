"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/app/login/actions";

const initialState: AuthActionState = { message: "" };

export function PasswordResetRequestForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={action} aria-busy={pending} className="grid gap-4">
      <input name="next" type="hidden" value={nextPath} />
      <label className="grid gap-2">
        <span className="label-caps text-muted-foreground">Email</span>
        <input
          autoComplete="email"
          autoFocus
          className="field-input h-12"
          inputMode="email"
          name="email"
          required
          type="email"
        />
      </label>
      <button
        className="min-h-11 rounded-xl bg-white px-4 text-[13px] font-bold text-foreground disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending recovery link…" : "Send recovery link"}
      </button>
      {state.message ? (
        <p
          className={`rounded-xl border p-3 text-[13px] leading-5 ${
            state.ok
              ? "border-[color-mix(in_srgb,var(--fitness)_30%,transparent)] bg-[color-mix(in_srgb,var(--fitness)_9%,transparent)] text-fitness-ink"
              : "border-[color-mix(in_srgb,var(--destructive)_30%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_9%,transparent)] text-destructive"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
