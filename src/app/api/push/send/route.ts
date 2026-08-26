import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductivityRange } from "@/lib/dashboard";
import { getFitnessPlanHistory, getFitnessSessions, shiftDate } from "@/lib/fitness";
import { getMomentum, getStreak } from "@/lib/momentum";
import { parseDashboardPreferences } from "@/lib/preferences";
import { rescoreProductivity } from "@/lib/productivity-score";
import {
  buildReminder,
  getLocalHour,
  isReminderDue,
} from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDateInTimeZone, getTaskCompletions, getTasks } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type SubscriptionRow = {
  auth: string;
  endpoint: string;
  id: string;
  p256dh: string;
};

function isAuthorised(request: Request) {
  // Vercel Cron sends CRON_SECRET; PUSH_CRON_SECRET is for calling it by hand.
  const secret = process.env.CRON_SECRET ?? process.env.PUSH_CRON_SECRET;
  if (!secret) return false;

  const offered = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  // Equal length first: timingSafeEqual throws on a mismatch, and the length
  // itself is not worth leaking through a thrown error either.
  return (
    offered.length === expected.length && timingSafeEqual(offered, expected)
  );
}

/** Everything this account needs for one decision, and nothing more. */
async function loadMomentum(
  supabase: SupabaseClient,
  userId: string,
  preferences: ReturnType<typeof parseDashboardPreferences>,
) {
  const calendar = preferences.regional;
  const today = getDateInTimeZone(new Date(), calendar.timeZone);
  const from = shiftDate(today, -59);
  const to = shiftDate(today, 1);

  const [tasks, completions, sessions, plan] = await Promise.all([
    getTasks(supabase, userId, { includeHistory: true }),
    getTaskCompletions(supabase, userId, from, to),
    getFitnessSessions(supabase, userId, from, to),
    getFitnessPlanHistory(supabase, userId, from, to),
  ]);

  const range = rescoreProductivity(
    getProductivityRange(tasks, completions, sessions, plan, today, 30, calendar),
    ["tasks", "fitness", "focus"],
    preferences.scoring,
  );

  return {
    momentum: getMomentum(range.current, today),
    streak: getStreak(range.current, today).streak,
    today,
  };
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!isAuthorised(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  // The public key is public by definition: the browser needs it to subscribe.
  // Accept either name so one generated pair configures both sides.
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return Response.json(
      { error: "Push is not configured on this deployment." },
      { status: 503 },
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:orbit@localhost",
    publicKey,
    privateKey,
  );

  const supabase = createAdminClient();
  const now = new Date();

  // Only accounts that asked for a reminder. The in-code check below still
  // runs: this filter is about not reading rows we have no business reading.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,dashboard_preferences")
    .eq("dashboard_preferences->reminders->>enabled", "true");

  if (error) {
    return Response.json({ error: "Could not read accounts." }, { status: 500 });
  }

  let considered = 0;
  let sent = 0;
  let removed = 0;

  for (const profile of profiles ?? []) {
    const preferences = parseDashboardPreferences(profile.dashboard_preferences);
    const localHour = getLocalHour(preferences.regional.timeZone, now);

    // The cheap checks first: most accounts fail on the hour and never touch
    // the database again this run.
    if (!preferences.reminders.enabled) continue;
    if (localHour !== preferences.reminders.hour) continue;
    considered += 1;

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("auth,endpoint,id,p256dh")
      .eq("user_id", profile.id);

    const devices = (subscriptions ?? []) as SubscriptionRow[];
    if (devices.length === 0) continue;

    const { momentum, streak, today } = await loadMomentum(
      supabase,
      profile.id,
      preferences,
    );

    const due = isReminderDue({
      // Deduplication is the insert below, which is atomic even if two runs
      // overlap; this flag stays false so the rule reads in one place.
      alreadySentToday: false,
      hasSubscription: true,
      localHour,
      reminders: preferences.reminders,
      todayScore: momentum.todayScore,
    });
    if (!due) continue;

    // The insert is the dedupe: a conflict means today is already handled,
    // even if two runs overlap.
    const { error: claimError } = await supabase
      .from("push_deliveries")
      .insert({ sent_on: today, user_id: profile.id });
    if (claimError) continue;

    const reminder = buildReminder({ momentum, streak });
    const payload = JSON.stringify({ ...reminder, url: "/" });

    for (const device of devices) {
      try {
        await webpush.sendNotification(
          {
            endpoint: device.endpoint,
            keys: { auth: device.auth, p256dh: device.p256dh },
          },
          payload,
        );
        sent += 1;
      } catch (sendError) {
        const status = (sendError as { statusCode?: number }).statusCode;
        // The device is gone for good. Keeping the row means sending into
        // nothing every evening from now on.
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", device.id);
          removed += 1;
        }
      }
    }
  }

  return Response.json({ considered, removed, sent });
}
