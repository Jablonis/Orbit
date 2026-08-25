"use client";

import { useActionState, useState } from "react";
import { addCrewMemberAction } from "@/app/crew/actions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { Button } from "@/components/ui/button";
import { TintPanel } from "@/components/ui/tint-panel";

/**
 * The only way into a crew: a code you read out or paste. No search, no
 * suggestions, nobody to stumble across.
 */
export function CrewCodePanel({ code }: { code: string }) {
  const [state, formAction] = useActionState(addCrewMemberAction, {
    message: "",
    ok: true,
  });
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the code is on screen either way.
    }
  };

  return (
    <TintPanel className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="label-caps text-muted-foreground">Your crew code</p>
        <p className="metric-value mt-2 text-[30px] font-bold tracking-[0.14em]">
          {code || "········"}
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Give it to someone you actually know. They see your days; nobody else
          can.
        </p>
        <Button
          className="mt-3"
          disabled={!code}
          onClick={() => void copy()}
          size="sm"
          type="button"
          variant="outline"
        >
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>

      <form action={formAction} className="flex flex-col gap-2 sm:w-64">
        <label className="label-caps text-muted-foreground" htmlFor="crew-code">
          Add by code
        </label>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          className="field-input uppercase tracking-[0.14em]"
          id="crew-code"
          maxLength={8}
          name="code"
          placeholder="ABCD2345"
          spellCheck={false}
          type="text"
        />
        <PendingSubmitButton
          className="ui-button ui-button--primary"
          pendingLabel="Sending…"
        >
          Send request
        </PendingSubmitButton>
        <p
          aria-live="polite"
          className={`min-h-4 text-[12px] ${
            state.ok ? "text-muted-foreground" : "text-destructive"
          }`}
        >
          {state.message}
        </p>
      </form>
    </TintPanel>
  );
}
