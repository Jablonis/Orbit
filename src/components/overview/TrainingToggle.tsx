"use client";

import { useActionState } from "react";
import { ActionToast } from "@/components/ActionToast";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { idleActionState } from "@/lib/action-state";
import { setTrainingDoneAction } from "@/app/fitness/actions";

/**
 * The one control on the fitness tile.
 *
 * It carries its own state for one reason: the button it replaces posted into
 * a server action that threw its answer away, so a rejected write looked
 * exactly like a successful one. Whatever it does now, it says.
 */
export function TrainingToggle({
  className,
  date,
  doneClassName,
  trained,
}: {
  className: string;
  date: string;
  doneClassName: string;
  trained: boolean;
}) {
  const [state, save] = useActionState(setTrainingDoneAction, idleActionState);

  return (
    <form action={save}>
      <input name="date" type="hidden" value={date} />
      <input name="completed" type="hidden" value={trained ? "false" : "true"} />
      <PendingSubmitButton
        className={trained ? doneClassName : className}
        pendingLabel="Saving…"
      >
        {trained ? "Done ✓" : "Mark done"}
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
