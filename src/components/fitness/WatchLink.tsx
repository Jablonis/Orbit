"use client";

import { useActionState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import {
  clearWatchTokenAction,
  createWatchTokenAction,
} from "@/app/fitness/watch-actions";
import { idleWatchToken } from "@/lib/watch-token-state";

/**
 * Connecting a watch.
 *
 * Xiaomi has no public API, so Orbit cannot go and fetch anything: the phone
 * pushes instead. Mi Fitness writes finished workouts into Apple Health, iOS
 * can run a Shortcut when one lands, and the Shortcut posts it here. That is
 * the whole mechanism, and it is worth saying on the screen — an integration
 * nobody understands is one nobody trusts with a secret.
 */
export function WatchLink({
  connectedOn,
  lastUsedOn,
  origin,
}: {
  connectedOn: string | null;
  lastUsedOn: string | null;
  origin: string;
}) {
  const [state, create] = useActionState(createWatchTokenAction, idleWatchToken);
  const [cleared, clear] = useActionState(clearWatchTokenAction, idleWatchToken);
  const endpoint = `${origin}/api/fitness/ingest`;
  const message = state.message || cleared.message;
  const failed = !state.ok || !cleared.ok;

  return (
    <section
      aria-labelledby="watch-link-heading"
      className="mt-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
    >
      <h2 className="text-[15px] font-bold tracking-[-0.02em]" id="watch-link-heading">
        Connect your watch
      </h2>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        Xiaomi has no public API, so Orbit cannot fetch anything from Mi Fitness
        itself. Your phone can push instead: Mi Fitness writes finished workouts
        into Apple Health, and a Shortcut sends them here.
      </p>

      {connectedOn ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Connected {connectedOn}
          {lastUsedOn
            ? ` · last workout received ${lastUsedOn}`
            : " · nothing received yet"}
        </p>
      ) : null}

      {state.token ? (
        <div className="mt-3 rounded-xl bg-muted p-3">
          <p className="label-caps text-muted-foreground">Your token</p>
          <code className="mt-1.5 block break-all text-[12px] leading-5">
            {state.token}
          </code>
          <p className="mt-2 text-[12px] font-semibold text-destructive">
            Copy it now. Only its fingerprint is stored, so it cannot be shown
            again — losing it means making a new one.
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={create}>
          <PendingSubmitButton
            className="ui-button ui-button--primary h-11 min-h-11 px-4 text-[13px]"
            pendingLabel="Making…"
          >
            {connectedOn ? "Make a new token" : "Connect a watch"}
          </PendingSubmitButton>
        </form>
        {connectedOn ? (
          <form action={clear}>
            <PendingSubmitButton
              className="ui-button ui-button--secondary h-11 min-h-11 px-4 text-[13px]"
              pendingLabel="Removing…"
            >
              Disconnect
            </PendingSubmitButton>
          </form>
        ) : null}
      </div>

      <details className="mt-4 border-t border-[var(--hairline)] pt-3">
        <summary className="cursor-pointer text-[13px] font-semibold">
          How to set up the Shortcut
        </summary>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-[12px] leading-5 text-muted-foreground">
          <li>
            In Mi Fitness: <strong>Profile → Settings → Apple Health</strong>,
            turn it on, and allow <strong>Workouts</strong> when iOS asks. Only
            what it writes from now on is visible to anything else.
          </li>
          <li>
            In Shortcuts, open <strong>Automation</strong> → <strong>+</strong>{" "}
            → <strong>Workout</strong>, choose <em>When: Ends</em> and{" "}
            <strong>Run Immediately</strong>. An automation that asks first will
            not fire while your phone is in a pocket.
          </li>
          <li>
            Add <strong>Health → Get Workouts</strong>. Sort by{" "}
            <em>End Date</em>, newest first, <strong>Limit 1</strong> — the
            trigger says a workout ended, it does not hand you the workout.
          </li>
          <li>Add <strong>Get Contents of URL</strong>, set as below.</li>
        </ol>
        <div className="mt-3 rounded-xl bg-muted p-3 text-[12px] leading-5">
          <p className="font-semibold">URL</p>
          <code className="block break-all">{endpoint}</code>
          <p className="mt-2 font-semibold">Method</p>
          <code className="block">POST</code>
          <p className="mt-2 font-semibold">Headers</p>
          <code className="block break-all">
            Authorization: Bearer &lt;your token&gt;
          </code>
          <p className="mt-2 font-semibold">Request Body · JSON</p>
          <code className="block break-all">
            sport (Text) → Workout Type
            <br />
            durationMinutes (Number) → Duration ÷ 60
          </code>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          Duration arrives in seconds, so divide it by 60 — anything over 1440
          minutes is refused rather than recorded as a twenty-hour session,
          which is how you will find out if you forgot. The day comes from your
          own time zone unless the body names a <code>date</code>, so an evening
          session lands on the evening you did it rather than on UTC&rsquo;s
          tomorrow.
        </p>
      </details>

      {message ? (
        <ActionToast message={message} tone={failed ? "error" : "success"} />
      ) : null}
    </section>
  );
}
