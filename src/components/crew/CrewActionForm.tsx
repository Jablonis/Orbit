"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import type { ActionState } from "@/lib/action-state";
import { idleActionState } from "@/lib/action-state";

/**
 * One crew button, with its answer attached.
 *
 * The respond and remove forms used to post into actions that returned
 * nothing, so accepting a request on an unmigrated database looked exactly
 * like accepting one on a working database. Every crew write now answers, and
 * this is the smallest wrapper that shows the answer.
 */
export function CrewActionForm({
  action,
  buttonClassName,
  children,
  fields,
  pendingLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  buttonClassName: string;
  children: ReactNode;
  fields: Record<string, string>;
  pendingLabel?: string;
}) {
  const [state, dispatch] = useActionState(action, idleActionState);

  return (
    <form action={dispatch}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <PendingSubmitButton className={buttonClassName} pendingLabel={pendingLabel}>
        {children}
      </PendingSubmitButton>
      {state.message ? (
        <ActionToast
          key={state.at}
          message={state.message}
          tone={state.ok ? "success" : "error"}
        />
      ) : null}
    </form>
  );
}
