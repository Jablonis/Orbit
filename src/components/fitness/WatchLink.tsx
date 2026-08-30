"use client";

import { useActionState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import {
  clearWatchTokenAction,
  createWatchTokenAction,
  idleWatchToken,
} from "@/app/fitness/watch-actions";

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
          <li>In Mi Fitness, turn on writing to Apple Health, and allow workouts.</li>
          <li>
            In Shortcuts, open <strong>Automation</strong> and add a personal
            automation for <strong>Workout</strong> → <em>When: Ends</em>, any
            workout. Turn off &ldquo;Ask Before Running&rdquo;.
          </li>
          <li>Add the action <strong>Get Contents of URL</strong>, set as below.</li>
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
            durationMinutes (Number) → Duration
          </code>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          The duration must be in minutes — if the Shortcut hands you seconds,
          divide by 60 first. The day comes from your own time zone unless the
          body names a <code>date</code>, so an evening session lands on the
          evening you did it rather than on UTC&rsquo;s tomorrow.
        </p>
      </details>

      {message ? (
        <ActionToast message={message} tone={failed ? "error" : "success"} />
      ) : null}
    </section>
  );
}
