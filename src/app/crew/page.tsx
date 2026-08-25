import type { Metadata } from "next";
import { CrewBoard } from "@/components/crew/CrewBoard";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  getCrewFeed,
  getCrewLeaderboard,
  getCrewReactions,
  getCrewSnapshots,
  getCrewState,
} from "@/lib/crew";
import { getWeekDateKeys, shiftDate } from "@/lib/fitness";
import { getDashboardPreferences } from "@/lib/preferences";
import { getDateInTimeZone } from "@/lib/tasks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crew",
};

export default async function CrewPage() {
  const { supabase, user } = await getAuthenticatedUser();
  const preferences = await getDashboardPreferences(supabase, user.id);
  const calendar = preferences.regional;
  const today = getDateInTimeZone(new Date(), calendar.timeZone);
  const week = getWeekDateKeys(today, calendar.weekStartsOn).filter(
    (day) => day <= today,
  );

  const crew = await getCrewState(
    supabase,
    user.id,
    calendar.displayName || "Orbit user",
  );
  // A fortnight is enough for the feed and covers any week start.
  const [snapshots, reactions] = await Promise.all([
    getCrewSnapshots(supabase, shiftDate(today, -13), today),
    getCrewReactions(supabase, shiftDate(today, -13), today),
  ]);

  return (
    <CrewBoard
      calendar={calendar}
      crew={crew}
      feed={getCrewFeed({
        members: crew.members,
        reactions,
        snapshots,
        viewerId: user.id,
      })}
      leaderboard={getCrewLeaderboard({
        days: week,
        members: crew.members,
        snapshots,
        viewerId: user.id,
        viewerName: calendar.displayName || "You",
      })}
      today={today}
      userEmail={user.email ?? "Orbit user"}
    />
  );
}
