import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";
import {
  toIngestDate,
  toIngestMinutes,
  toIngestSport,
} from "@/lib/watch-ingest";

export const dynamic = "force-dynamic";

/**
 * A workout, pushed in from the phone.
 *
 * Xiaomi has no public API, so nothing here can reach Mi Fitness. What the
 * phone can do is notice a finished workout — Mi Fitness writes to Apple
 * Health, and iOS runs a Shortcut on the event — and post it. So the watch
 * pushes and Orbit listens, which also means no credentials of Xiaomi's are
 * ever held here.
 *
 * The caller proves itself with a bearer token whose hash is the only copy
 * stored. Resolving it needs to read a row the caller does not own yet, which
 * is the one thing row-level security cannot express, so it goes through the
 * service-role client — server-side only, exactly as the reminder sender does.
 */

function bad(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { headers: { "Cache-Control": "no-store" }, status },
  );
}

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (token.length < 32) return bad("A bearer token is required.", 401);

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("Send a JSON body.", 400);
  }

  const admin = createAdminClient();
  const { data: hashRow, error: hashError } = await admin.rpc(
    "hash_ingest_token",
    { p_token: token },
  );
  if (hashError) {
    console.error("ingest: hashing failed", hashError.code, hashError.message);
    return bad("This server cannot accept workouts yet.", 503);
  }

  const { data: owner, error: lookupError } = await admin
    .from("ingest_tokens")
    .select("user_id")
    .eq("token_hash", hashRow as unknown as string)
    .maybeSingle();

  if (lookupError) {
    console.error("ingest: lookup failed", lookupError.code, lookupError.message);
    return bad("This server cannot accept workouts yet.", 503);
  }
  // The same answer for a wrong token and a missing one: a probe learns
  // nothing from the difference.
  if (!owner) return bad("Unknown token.", 401);

  const userId = owner.user_id as string;
  const preferences = await getDashboardPreferences(admin, userId);
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  // The phone may name the day; if it does not, the account's own day is used
  // rather than the server's, which is in UTC and would be wrong every evening.
  const date = toIngestDate(payload.date) ?? today;
  if (date > today) return bad("That day has not happened yet.", 400);

  const duration = toIngestMinutes(payload.durationMinutes);
  if (duration === null) {
    return bad("durationMinutes must be between 1 and 1440.", 400);
  }

  const sport = toIngestSport(String(payload.sport ?? ""));
  const row = {
    completed: true,
    duration_minutes: duration,
    performed_on: date,
    sport,
    user_id: userId,
  };

  const { error: writeError } = await admin
    .from("fitness_sessions")
    .upsert(row, { onConflict: "user_id,performed_on" });

  if (writeError) {
    console.error("ingest: write failed", writeError.code, writeError.message);
    return bad("The session could not be saved.", 500);
  }

  await admin
    .from("ingest_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId);

  return NextResponse.json(
    { date, durationMinutes: duration, ok: true, sport },
    { headers: { "Cache-Control": "no-store" } },
  );
}
