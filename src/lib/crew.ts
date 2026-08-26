/**
 * The crew.
 *
 * Orbit is single-player until someone hands you a code. What crosses between
 * two accounts is only ever a published day — a score, an altitude, a tier, a
 * run and how many rings closed. No task titles, no sessions, no money, and no
 * directory: there is nothing to browse and nobody to find.
 *
 * The shaping below is pure and unit tested; the queries are thin.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ORBIT_DAY_SCORE, getOrbitTier } from "@/lib/momentum";
import type { OrbitTier } from "@/lib/momentum";

export const reactionKinds = ["fire", "clap", "eyes"] as const;
export type ReactionKind = (typeof reactionKinds)[number];

export const reactionGlyphs: Record<ReactionKind, string> = {
  clap: "👏",
  eyes: "👀",
  fire: "🔥",
};

export const reactionLabels: Record<ReactionKind, string> = {
  clap: "Respect",
  eyes: "Watching",
  fire: "On fire",
};

export type CrewMember = {
  displayName: string;
  friendshipId: string;
  userId: string;
};

export type CrewRequest = {
  direction: "incoming" | "outgoing";
  displayName: string;
  friendshipId: string;
  userId: string;
};

export type CrewSnapshot = {
  altitude: number;
  day: string;
  ringsClosed: number;
  ringsTotal: number;
  score: number;
  streak: number;
  tierId: string;
  userId: string;
};

export type CrewReaction = {
  day: string;
  fromUser: string;
  kind: ReactionKind;
  toUser: string;
};

export type FeedEntry = {
  day: string;
  displayName: string;
  headline: string;
  /** Reaction counts, and whether this account is one of them. */
  reactions: Array<{ count: number; kind: ReactionKind; mine: boolean }>;
  snapshot: CrewSnapshot;
  tier: OrbitTier;
  userId: string;
};

export type LeaderboardRow = {
  daysInOrbit: number;
  displayName: string;
  isYou: boolean;
  points: number;
  position: number;
  userId: string;
};

export type CrewState = {
  code: string;
  displayName: string;
  members: CrewMember[];
  requests: CrewRequest[];
};

/** What `request_friendship` reports back, and what to say about it. */
export const crewRequestOutcomes = {
  accepted: "You are in. Their days show up here from now on.",
  already: "You are already in the same crew.",
  pending: "That request is already sent — they have not answered yet.",
  requested: "Request sent. It counts once they accept.",
  self: "That is your own code.",
  unknown: "No crew member has that code.",
} as const;

export type CrewRequestOutcome = keyof typeof crewRequestOutcomes;

export function isCrewRequestOutcome(
  value: unknown,
): value is CrewRequestOutcome {
  return typeof value === "string" && value in crewRequestOutcomes;
}

// ------------------------------------------------------------------ shaping

/**
 * The feed: every crew member's published days, most recent first, with the
 * reactions already counted. Your own days are not in it — you have a
 * dashboard for those.
 */
export function getCrewFeed({
  members,
  reactions,
  snapshots,
  viewerId,
}: {
  members: CrewMember[];
  reactions: CrewReaction[];
  snapshots: CrewSnapshot[];
  viewerId: string;
}): FeedEntry[] {
  const names = new Map(members.map((member) => [member.userId, member.displayName]));

  return snapshots
    .filter((snapshot) => snapshot.userId !== viewerId)
    .filter((snapshot) => names.has(snapshot.userId))
    .sort((a, b) => b.day.localeCompare(a.day) || a.userId.localeCompare(b.userId))
    .map((snapshot) => {
      const displayName = names.get(snapshot.userId) ?? "Orbit user";
      const forDay = reactions.filter(
        (reaction) =>
          reaction.toUser === snapshot.userId && reaction.day === snapshot.day,
      );

      return {
        day: snapshot.day,
        displayName,
        headline: getFeedHeadline(snapshot, displayName),
        reactions: reactionKinds.map((kind) => ({
          count: forDay.filter((reaction) => reaction.kind === kind).length,
          kind,
          mine: forDay.some(
            (reaction) => reaction.kind === kind && reaction.fromUser === viewerId,
          ),
        })),
        snapshot,
        tier: getOrbitTier(snapshot.altitude),
        userId: snapshot.userId,
      };
    });
}

/** One line per day, in the app's own vocabulary rather than a number dump. */
function getFeedHeadline(snapshot: CrewSnapshot, displayName: string) {
  const name = displayName.split(" ")[0] || displayName;

  if (snapshot.ringsTotal > 0 && snapshot.ringsClosed >= snapshot.ringsTotal) {
    return `${name} cleared every stage.`;
  }
  if (snapshot.streak >= 7) {
    return `${name} is ${snapshot.streak} days deep.`;
  }
  if (snapshot.score >= ORBIT_DAY_SCORE) {
    return `${name} held orbit.`;
  }
  if (snapshot.score > 0) {
    return `${name} logged a light day.`;
  }
  return `${name} took the day off.`;
}

/**
 * This week's table: a point per day in orbit, ordered by that and then by the
 * total score. You are always in it, even with nothing logged, because a board
 * you are missing from is not a board you compete on.
 */
export function getCrewLeaderboard({
  days,
  members,
  snapshots,
  viewerId,
  viewerName,
}: {
  /** The dates the table covers, usually the current week so far. */
  days: string[];
  members: CrewMember[];
  snapshots: CrewSnapshot[];
  viewerId: string;
  viewerName: string;
}): LeaderboardRow[] {
  const window = new Set(days);
  const people = [
    { displayName: viewerName, userId: viewerId },
    ...members.map((member) => ({
      displayName: member.displayName,
      userId: member.userId,
    })),
  ];

  return people
    .map((person) => {
      const own = snapshots.filter(
        (snapshot) => snapshot.userId === person.userId && window.has(snapshot.day),
      );
      return {
        daysInOrbit: own.filter((snapshot) => snapshot.score >= ORBIT_DAY_SCORE)
          .length,
        displayName: person.displayName,
        isYou: person.userId === viewerId,
        points: own.reduce((total, snapshot) => total + snapshot.score, 0),
        position: 0,
        userId: person.userId,
      };
    })
    .sort(
      (a, b) =>
        b.daysInOrbit - a.daysInOrbit ||
        b.points - a.points ||
        a.displayName.localeCompare(b.displayName),
    )
    .map((row, index) => ({ ...row, position: index + 1 }));
}

/** The line under the table: where you stand, said plainly. */
export function getStandingLine(rows: LeaderboardRow[]) {
  const you = rows.find((row) => row.isYou);
  if (!you) return "";
  if (rows.length === 1) {
    return "Nobody in the crew yet. A code is all it takes.";
  }
  if (you.position === 1) {
    const next = rows[1];
    const lead = you.daysInOrbit - next.daysInOrbit;
    return lead > 0
      ? `You lead by ${lead} day${lead === 1 ? "" : "s"}.`
      : "You lead on points alone. It will not hold itself.";
  }

  const ahead = rows[you.position - 2];
  const gap = ahead.daysInOrbit - you.daysInOrbit;
  return gap > 0
    ? `${gap} day${gap === 1 ? "" : "s"} behind ${ahead.displayName}.`
    : `Level with ${ahead.displayName} on days, behind on points.`;
}

// ------------------------------------------------------------------ queries

export async function getCrewState(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
): Promise<CrewState> {
  // Creating the identity is idempotent, and it is what mints the code.
  const { data: code } = await supabase.rpc("ensure_orbit_profile", {
    p_display_name: displayName,
  });

  const { data: links } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status");

  const rows = links ?? [];
  const otherIds = rows.map((row) =>
    row.requester_id === userId ? row.addressee_id : row.requester_id,
  );

  const { data: profiles } = otherIds.length
    ? await supabase
        .from("orbit_profiles")
        .select("user_id, display_name")
        .in("user_id", otherIds)
    : { data: [] };

  const names = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile.display_name]),
  );

  const members: CrewMember[] = [];
  const requests: CrewRequest[] = [];

  rows.forEach((row) => {
    const otherId =
      row.requester_id === userId ? row.addressee_id : row.requester_id;
    const entry = {
      displayName: names.get(otherId) ?? "Orbit user",
      friendshipId: row.id,
      userId: otherId,
    };

    if (row.status === "accepted") {
      members.push(entry);
      return;
    }
    requests.push({
      ...entry,
      direction: row.requester_id === userId ? "outgoing" : "incoming",
    });
  });

  return {
    code: typeof code === "string" ? code : "",
    displayName,
    members: members.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    requests,
  };
}

export async function getCrewSnapshots(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<CrewSnapshot[]> {
  const { data } = await supabase
    .from("orbit_snapshots")
    .select("user_id, day, score, altitude, tier_id, streak, rings_closed, rings_total")
    .gte("day", from)
    .lte("day", to)
    .order("day", { ascending: false });

  return (data ?? []).map((row) => ({
    altitude: row.altitude,
    day: row.day,
    ringsClosed: row.rings_closed,
    ringsTotal: row.rings_total,
    score: row.score,
    streak: row.streak,
    tierId: row.tier_id,
    userId: row.user_id,
  }));
}

export async function getCrewReactions(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<CrewReaction[]> {
  const { data } = await supabase
    .from("orbit_reactions")
    .select("from_user, to_user, day, kind")
    .gte("day", from)
    .lte("day", to);

  return (data ?? [])
    .filter((row): row is typeof row & { kind: ReactionKind } =>
      reactionKinds.includes(row.kind),
    )
    .map((row) => ({
      day: row.day,
      fromUser: row.from_user,
      kind: row.kind,
      toUser: row.to_user,
    }));
}

/**
 * Publishes today's numbers for the crew to see. Called where the numbers are
 * already computed; it is a no-op for an account with nobody in its crew, so
 * nothing is stored for someone who is not sharing with anyone.
 */
export async function publishSnapshot(
  supabase: SupabaseClient,
  snapshot: {
    altitude: number;
    day: string;
    ringsClosed: number;
    ringsTotal: number;
    score: number;
    streak: number;
    tierId: string;
  },
) {
  await supabase.rpc("publish_orbit_snapshot", {
    p_altitude: Math.round(snapshot.altitude),
    p_day: snapshot.day,
    p_rings_closed: snapshot.ringsClosed,
    p_rings_total: snapshot.ringsTotal,
    p_score: Math.round(snapshot.score),
    p_streak: snapshot.streak,
    p_tier_id: snapshot.tierId,
  });
}

export async function hasCrew(supabase: SupabaseClient) {
  const { count } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted");

  return (count ?? 0) > 0;
}
