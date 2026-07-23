"use client";

import { useActionState } from "react";
import { AuthActionState, loginAction, signupAction } from "./actions";

const initialState: AuthActionState = { message: "" };

export function LoginForm() {
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
        <AuthFields passwordAutocomplete="current-password" />
        <button
          className="rounded-[14px] bg-white px-4 py-3 text-[13px] font-semibold text-[#202020] transition hover:bg-white/90 disabled:opacity-60"
          disabled={loginPending}
          type="submit"
        >
          {loginPending ? "Signing in..." : "Log in"}
        </button>
        {loginState.message ? (
          <p
            aria-live="assertive"
            className="rounded-[12px] border border-[#ff8a80]/30 bg-[#ff8a80]/10 p-3 text-[13px] text-[#ffd7d3]"
            role="alert"
          >
            {loginState.message}
          </p>
        ) : null}
      </form>

      <div className="flex items-center gap-3 text-[#555]">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[12px] uppercase tracking-[0.18em] text-[#8d9092]">
          or
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form action={signupFormAction} className="grid gap-3">
        <AuthFields passwordAutocomplete="new-password" />
        <button
          className="rounded-[14px] border border-white/10 bg-[#201f1f] px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-[#303030] disabled:opacity-60"
          disabled={signupPending}
          type="submit"
        >
          {signupPending ? "Creating account..." : "Create account"}
        </button>
        {signupState.message ? (
          <p
            aria-live="polite"
            className="rounded-[12px] border border-white/10 bg-[#201f1f]/70 p-3 text-[13px] text-[#c4c7c8]"
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
        <span className="label-caps text-[#c4c7c8]">Email</span>
        <input
          autoComplete="email"
          className="h-12 rounded-[14px] border border-white/10 bg-[#201f1f] px-4 text-[14px] text-white outline-none focus:border-white/35"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="grid gap-2">
        <span className="label-caps text-[#c4c7c8]">Password</span>
        <input
          autoComplete={passwordAutocomplete}
          className="h-12 rounded-[14px] border border-white/10 bg-[#201f1f] px-4 text-[14px] text-white outline-none focus:border-white/35"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </label>
    </>
  );
}
