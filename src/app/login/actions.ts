"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSafeReturnPath } from "@/lib/auth-return";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  message: string;
  ok?: boolean;
};

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeReturnPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { message: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { message: error.message };
  }

  redirect(nextPath);
}

export async function signupAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeReturnPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { message: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { message: error.message };
  }

  if (!data.session) {
    return { message: "Account created. Check your email if confirmation is enabled." };
  }

  redirect(nextPath);
}

export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const nextPath = getSafeReturnPath(String(formData.get("next") ?? ""));
  if (!email) return { message: "Enter the email used for Orbit." };

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const requestHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  let recoveryOrigin = "";
  try {
    const parsedOrigin = new URL(origin ?? "");
    if (
      !requestHost ||
      parsedOrigin.host !== requestHost ||
      !["http:", "https:"].includes(parsedOrigin.protocol)
    ) {
      throw new Error("Invalid recovery origin");
    }
    recoveryOrigin = parsedOrigin.origin;
  } catch {
    return { message: "Recovery is temporarily unavailable. Try again." };
  }

  const supabase = await createClient();
  const resetPath = new URL("/reset-password", recoveryOrigin);
  resetPath.searchParams.set("next", nextPath);
  const callbackUrl = new URL("/auth/callback", recoveryOrigin);
  callbackUrl.searchParams.set(
    "next",
    `${resetPath.pathname}${resetPath.search}`,
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    return { message: "Recovery is temporarily unavailable. Try again." };
  }

  return {
    message:
      "If an Orbit account uses that email, a recovery link is on its way.",
    ok: true,
  };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  const nextPath = getSafeReturnPath(String(formData.get("next") ?? ""));
  if (password.length < 8) {
    return { message: "Use at least 8 characters for the new password." };
  }
  if (password !== confirmation) {
    return { message: "The password confirmation does not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      message:
        "This recovery link may have expired. Request a new link and try again.",
    };
  }

  await supabase.auth.signOut();
  const loginPath = new URL("/login", "https://orbit.local");
  loginPath.searchParams.set("next", nextPath);
  loginPath.searchParams.set("recovery", "complete");
  redirect(`${loginPath.pathname}${loginPath.search}`);
}
