"use client";

import { ActionToast } from "@/components/ActionToast";
import { useActionState, useEffect, useState } from "react";
import { saveReminderPreferencesAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { REMINDER_HOURS, type ReminderPreferences } from "@/lib/reminders";

type Support =
  | "checking"
  | "denied"
  | "install-first"
  | "ready"
  | "unsupported";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/**
 * One evening reminder, carrying the score today still needs. Turning it on
 * needs three things to line up — the browser has to support push, the person
 * has to allow it, and on iOS the app has to be installed to the home screen —
 * so the control says which one is missing rather than failing quietly.
 */
export function ReminderSettings({
  reminders,
}: {
  reminders: ReminderPreferences;
}) {
  const [state, action, pending] = useActionState(
    saveReminderPreferencesAction,
    { message: "", ok: true },
  );
  const [support, setSupport] = useState<Support>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hour, setHour] = useState(String(reminders.hour));

  useEffect(() => {
    const detect = (): Support => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported) return "unsupported";

      // iOS only grants push to a home-screen install, and says so nowhere.
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const installed =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator &&
          (navigator as { standalone?: boolean }).standalone === true);
      if (isIos && !installed) return "install-first";

      return Notification.permission === "denied" ? "denied" : "ready";
    };

    const frame = window.requestAnimationFrame(() => setSupport(detect()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const enable = async () => {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSupport(permission === "denied" ? "denied" : "ready");
        setError("Orbit needs permission to send the reminder.");
        return;
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setError("Push is not configured on this deployment yet.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(key),
        userVisibleOnly: true,
      });

      const response = await fetch("/api/push/subscribe", {
        body: JSON.stringify(subscription.toJSON()),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        setError("The subscription could not be saved. Please try again.");
        return;
      }

      const form = new FormData();
      form.set("enabled", "true");
      form.set("hour", hour);
      action(form);
    } catch {
      setError("The reminder could not be turned on. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          headers: { "content-type": "application/json" },
          method: "DELETE",
        });
        await subscription.unsubscribe();
      }
      const form = new FormData();
      form.set("enabled", "false");
      form.set("hour", hour);
      action(form);
    } catch {
      setError("The reminder could not be turned off. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const changeHour = (next: string) => {
    setHour(next);
    if (!reminders.enabled) return;
    const form = new FormData();
    form.set("enabled", "true");
    form.set("hour", next);
    action(form);
  };

  return (
    <section className="rounded-2xl bg-muted p-4 sm:p-5">
      <p className="label-caps text-muted-foreground">Evening reminder</p>
      <p className="mt-2 text-[15px] font-semibold">
        {reminders.enabled
          ? `One notification at ${reminders.hour}:00, only when the day is not in orbit yet.`
          : "One notification in the evening, carrying the score today still needs."}
      </p>

      {support === "unsupported" ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          This browser cannot receive push notifications.
        </p>
      ) : support === "install-first" ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          On iPhone, add Orbit to your home screen first — Safari only allows
          notifications for an installed app.
        </p>
      ) : support === "denied" ? (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Notifications are blocked for this site. Allow them in your browser
          settings, then come back.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={busy || pending || support === "checking"}
            onClick={reminders.enabled ? disable : enable}
            type="button"
            variant={reminders.enabled ? "outline" : "default"}
          >
            {reminders.enabled ? "Turn off" : "Turn on reminders"}
          </Button>

          <label className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="text-muted-foreground">At</span>
            <Select
              aria-label="Reminder hour"
              className="h-11 w-24"
              disabled={busy || pending}
              onChange={(event) => changeHour(event.target.value)}
              value={hour}
            >
              {REMINDER_HOURS.map((option) => (
                <option key={option} value={option}>
                  {option}:00
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}

      {!error && state.message && state.ok ? (
        <ActionToast message={state.message} tone="success" />
      ) : null}
      {error || (state.message && !state.ok) ? (
        <p aria-live="polite" className="mt-3 text-[13px] text-destructive">
          {error || state.message}
        </p>
      ) : null}
    </section>
  );
}
