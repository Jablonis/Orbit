"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import { actionResult } from "@/lib/action-state";
import {
  type ReactionKind,
  crewRequestOutcomes,
  describeCrewError,
  isCrewRequestOutcome,
  reactionKinds,
} from "@/lib/crew";

type CrewActionState = ActionState;

export async function addCrewMemberAction(
  _state: CrewActionState,
  formData: FormData,
): Promise<CrewActionState> {
  const { supabase } = await getAuthenticatedUser();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 8);

  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return actionResult(false, "A crew code is eight letters and numbers.");
  }

  const { data, error } = await supabase.rpc("request_friendship", {
    p_code: code,
  });

  // "Try again" was the old answer to every failure, including a database
  // without the crew tables — where trying again can never work. The real
  // reason goes to the screen as well as the log.
  if (error) {
    console.error("crew: request failed", error.code, error.message);
    return actionResult(false, describeCrewError(error));
  }
  if (!isCrewRequestOutcome(data)) {
    return actionResult(false, "The crew service gave an unexpected answer.");
  }

  revalidatePath("/crew");
  return actionResult(
    data === "requested" || data === "accepted" || data === "already",
    crewRequestOutcomes[data],
  );
}

export async function respondToCrewRequestAction(
  _state: CrewActionState,
  formData: FormData,
): Promise<CrewActionState> {
  const { supabase } = await getAuthenticatedUser();
  const id = String(formData.get("friendshipId") ?? "");
  if (!id) return actionResult(false, "That request no longer exists.");
  const accepted = formData.get("intent") === "accept";

  const { error } = await supabase.rpc("respond_to_friendship", {
    p_accept: accepted,
    p_id: id,
  });
  if (error) {
    console.error("crew: respond failed", error.code, error.message);
    return actionResult(false, describeCrewError(error));
  }

  revalidatePath("/crew");
  return actionResult(true, accepted ? "Welcome aboard." : "Request declined.");
}

export async function removeCrewMemberAction(
  _state: CrewActionState,
  formData: FormData,
): Promise<CrewActionState> {
  const { supabase } = await getAuthenticatedUser();
  const id = String(formData.get("friendshipId") ?? "");
  if (!id) return actionResult(false, "That crew member no longer exists.");

  const { error } = await supabase.rpc("remove_friendship", { p_id: id });
  if (error) {
    console.error("crew: remove failed", error.code, error.message);
    return actionResult(false, describeCrewError(error));
  }

  revalidatePath("/crew");
  return actionResult(true, "Removed from your crew.");
}

/** Sending the same reaction twice takes it back; the database decides which. */
export async function reactToDayAction(formData: FormData) {
  const { supabase } = await getAuthenticatedUser();
  const day = String(formData.get("day") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const toUser = String(formData.get("toUser") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !toUser) return;
  if (!reactionKinds.includes(kind as ReactionKind)) return;

  const { error } = await supabase.rpc("react_to_day", {
    p_day: day,
    p_kind: kind,
    p_to_user: toUser,
  });
  // A rejected reaction ("Not in your crew") used to be indistinguishable from
  // a delivered one. The tap is too small a gesture for a toast, but the page
  // must not pretend, so the failure at least reaches the log and the page is
  // not revalidated into showing a reaction that never landed.
  if (error) {
    console.error("crew: reaction failed", error.code, error.message);
    return;
  }

  revalidatePath("/crew");
}
