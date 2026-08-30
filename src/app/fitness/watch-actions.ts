"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";

export type WatchTokenState = {
  message: string;
  ok: boolean;
  /** Shown exactly once, at the moment it is made. Never stored in the clear. */
  token: string;
};

export const idleWatchToken: WatchTokenState = {
  message: "",
  ok: true,
  token: "",
};

/**
 * A 32-byte secret, hex. Generated on the server so it comes from a real
 * cryptographic source rather than whatever the browser felt like.
 */
function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createWatchTokenAction(): Promise<WatchTokenState> {
  try {
    const { supabase } = await getAuthenticatedUser();
    const token = newToken();
    const { error } = await supabase.rpc("set_ingest_token", { p_token: token });

    if (error) {
      console.error("watch: token write failed", error.code, error.message);
      return { message: error.message, ok: false, token: "" };
    }

    revalidatePath("/fitness");
    return {
      message: "Copy it now — it is not shown again.",
      ok: true,
      token,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("watch: token action threw", reason);
    return { message: reason, ok: false, token: "" };
  }
}

export async function clearWatchTokenAction(): Promise<WatchTokenState> {
  try {
    const { supabase } = await getAuthenticatedUser();
    const { error } = await supabase.rpc("clear_ingest_token");

    if (error) {
      console.error("watch: token clear failed", error.code, error.message);
      return { message: error.message, ok: false, token: "" };
    }

    revalidatePath("/fitness");
    return { message: "Disconnected. The old token no longer works.", ok: true, token: "" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { message: reason, ok: false, token: "" };
  }
}
