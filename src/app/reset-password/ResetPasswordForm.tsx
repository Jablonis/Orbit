"use client";

import { useActionState } from "react";
import {
  updatePasswordAction,
  type AuthActionState,
} from "@/app/login/actions";

const initialState: AuthActionState = { message: "" };

export function ResetPasswordForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={action} aria-busy={pending} className="grid gap-4">
      <input name="next" type="hidden" value={nextPath} />
      <label className="grid gap-2">
        <span className="label-caps text-[var(--text-secondary)]">
          New password
        </span>
        <input
          autoComplete="new-password"
          autoFocus
          className="field-input h-12"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="grid gap-2">
        <span className="label-caps text-[var(--text-secondary)]">
          Confirm new password
        </span>
        <input
          autoComplete="new-password"
          className="field-input h-12"
          minLength={8}
          name="passwordConfirmation"
          required
          type="password"
        />
      </label>
      <button
        className="min-h-11 rounded-[var(--radius-control)] bg-white px-4 text-[13px] font-bold text-[var(--text-on-light)] disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Updating password…" : "Update password"}
      </button>
      {state.message ? (
        <p
          className="rounded-[12px] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] p-3 text-[13px] text-[var(--danger-text)]"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
