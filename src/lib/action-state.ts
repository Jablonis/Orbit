/**
 * The one shape every server action answers with.
 *
 * The audit found five different conventions across the actions — `{ok,error}`,
 * `{message,ok}`, throwing, swallowing, and logging-only — two of them living
 * in the same file. Every one of those was an honest first draft that the next
 * feature copied slightly wrong. This is the single shape they converge on,
 * and it lives here rather than in any `"use server"` file because such a file
 * may only export async functions: exporting the idle constant from one is a
 * contract violation that surfaces as a production crash with no line number.
 *
 * `at` is the action's own timestamp. It exists because `useActionState` keeps
 * the last result forever: without a clock, two presses of the same button are
 * indistinguishable, a stale toast never leaves, and a save's message can be
 * outranked by an archive that failed ten minutes ago.
 */

export type ActionState = {
  /** When the action answered, from Date.now(). Absent only on the idle state. */
  at?: number;
  message: string;
  ok: boolean;
};

export const idleActionState: ActionState = { message: "", ok: true };

/** A finished answer, stamped. */
export function actionResult(ok: boolean, message: string): ActionState {
  return { at: Date.now(), message, ok };
}

/**
 * Which of several independent action states spoke last.
 *
 * A page with a save form and an archive button holds two `useActionState`
 * results at once. Rendering `a.message || b.message` reports whichever is
 * truthy first, not whichever happened — which is how a failed remove got
 * announced with a stale "Habit added.". The most recent `at` wins; states
 * that never fired have no `at` and never win.
 */
export function latestFeedback(
  states: ActionState[],
): Required<ActionState> | null {
  let latest: Required<ActionState> | null = null;
  for (const state of states) {
    if (state.at === undefined || !state.message) continue;
    if (!latest || state.at > latest.at) {
      latest = { at: state.at, message: state.message, ok: state.ok };
    }
  }
  return latest;
}
