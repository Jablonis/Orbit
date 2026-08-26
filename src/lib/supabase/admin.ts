import { createClient } from "@supabase/supabase-js";

/**
 * A server-only client that bypasses row-level security. It exists for exactly
 * one job: the scheduled sender, which has to read every account's reminder
 * settings and subscriptions. The key must never reach a NEXT_PUBLIC_ variable
 * — that would ship it to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
