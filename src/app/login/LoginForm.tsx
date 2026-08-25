"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthActionState, loginAction, signupAction } from "./actions";

const initialState: AuthActionState = { message: "" };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initialState,
  );
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <div className="grid gap-4">
      <form action={loginFormAction} className="grid gap-3">
        <input name="next" type="hidden" value={nextPath} />
        <AuthFields passwordAutocomplete="current-password" />
        <Link
          className="justify-self-end text-[13px] font-semibold text-primary hover:underline"
          href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
        >
          Forgot password?
        </Link>
        <button
          className="rounded-xl bg-white px-4 py-3 text-[13px] font-semibold text-foreground transition hover:bg-[rgba(244,235,221,0.9)] disabled:opacity-60"
          disabled={loginPending}
          type="submit"
        >
          {loginPending ? "Signing in..." : "Log in"}
        </button>
        {loginState.message ? (
          <p
            aria-live="assertive"
            className="rounded-xl border border-[var(--destructive)]/30 bg-destructive/10 p-3 text-[13px] text-destructive"
            role="alert"
          >
            {loginState.message}
          </p>
        ) : null}
      </form>

      <div className="flex items-center gap-3 text-[#555]">
        <span className="h-px flex-1 bg-[rgba(244,235,221,0.1)]" />
        <span className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-[rgba(244,235,221,0.1)]" />
      </div>

      <form action={signupFormAction} className="grid gap-3">
        <input name="next" type="hidden" value={nextPath} />
        <AuthFields passwordAutocomplete="new-password" />
        <button
          className="rounded-xl border border-[rgba(244,235,221,0.1)] bg-muted px-4 py-3 text-[13px] font-semibold text-foreground transition hover:bg-accent disabled:opacity-60"
          disabled={signupPending}
          type="submit"
        >
          {signupPending ? "Creating account..." : "Create account"}
        </button>
        {signupState.message ? (
          <p
            aria-live="polite"
            className="rounded-xl border border-[rgba(244,235,221,0.1)] bg-muted/70 p-3 text-[13px] text-muted-foreground"
            role="status"
          >
            {signupState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function AuthFields({
  passwordAutocomplete,
}: {
  passwordAutocomplete: "current-password" | "new-password";
}) {
  return (
    <>
      <label className="grid gap-2">
        <span className="label-caps text-muted-foreground">Email</span>
        <input
          autoComplete="email"
          className="h-12 rounded-xl border border-[rgba(244,235,221,0.1)] bg-muted px-4 text-[14px] text-foreground outline-none focus:border-[rgba(244,235,221,0.35)]"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2">
        <span className="label-caps text-muted-foreground">Password</span>
        <input
          autoComplete={passwordAutocomplete}
          className="h-12 rounded-xl border border-[rgba(244,235,221,0.1)] bg-muted px-4 text-[14px] text-foreground outline-none focus:border-[rgba(244,235,221,0.35)]"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </label>
    </>
  );
}
