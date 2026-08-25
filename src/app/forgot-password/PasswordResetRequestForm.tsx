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
        <span className="label-caps text-[var(--text-secondary)]">Email</span>
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
        className="min-h-11 rounded-[var(--radius-control)] bg-white px-4 text-[13px] font-bold text-[var(--text-on-light)] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending recovery link…" : "Send recovery link"}
      </button>
      {state.message ? (
        <p
          className={`rounded-[var(--radius-control)] border p-3 text-[13px] leading-5 ${
            state.ok
              ? "border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color-mix(in_srgb,var(--success)_9%,transparent)] text-[var(--success-text)]"
              : "border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] text-[var(--danger-text)]"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
