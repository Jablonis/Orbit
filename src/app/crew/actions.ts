"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type ReactionKind,
  crewRequestOutcomes,
  isCrewRequestOutcome,
  reactionKinds,
} from "@/lib/crew";

export type CrewActionState = {
  message: string;
  ok: boolean;
};

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
    return { message: "A crew code is eight letters and numbers.", ok: false };
  }

  const { data, error } = await supabase.rpc("request_friendship", {
    p_code: code,
  });

  if (error || !isCrewRequestOutcome(data)) {
    return { message: "That request could not be sent. Try again.", ok: false };
  }

  revalidatePath("/crew");
  return {
    message: crewRequestOutcomes[data],
    ok: data === "requested" || data === "accepted" || data === "already",
  };
}

export async function respondToCrewRequestAction(formData: FormData) {
  const { supabase } = await getAuthenticatedUser();
  const id = String(formData.get("friendshipId") ?? "");
  if (!id) return;

  await supabase.rpc("respond_to_friendship", {
    p_accept: formData.get("intent") === "accept",
    p_id: id,
  });

  revalidatePath("/crew");
}

export async function removeCrewMemberAction(formData: FormData) {
  const { supabase } = await getAuthenticatedUser();
  const id = String(formData.get("friendshipId") ?? "");
  if (!id) return;

  await supabase.rpc("remove_friendship", { p_id: id });
  revalidatePath("/crew");
}

/** Sending the same reaction twice takes it back; the database decides which. */
export async function reactToDayAction(formData: FormData) {
  const { supabase } = await getAuthenticatedUser();
  const day = String(formData.get("day") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const toUser = String(formData.get("toUser") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !toUser) return;
  if (!reactionKinds.includes(kind as ReactionKind)) return;

  await supabase.rpc("react_to_day", {
    p_day: day,
    p_kind: kind,
    p_to_user: toUser,
  });

  revalidatePath("/crew");
}
