import type { ActionState } from "@/lib/action-state";

export type WatchTokenState = ActionState & {
  /** Shown exactly once, at the moment it is made. Never stored in the clear. */
  token: string;
};

export const idleWatchToken: WatchTokenState = {
  message: "",
  ok: true,
  token: "",
};
