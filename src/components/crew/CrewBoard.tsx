import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { CrewCodePanel } from "@/components/crew/CrewCodePanel";
import { AppNavigation } from "@/components/AppNavigation";
import { Pip } from "@/components/brand/Pip";
import { Badge } from "@/components/ui/badge";
import { TintPanel } from "@/components/ui/tint-panel";
import { ORBIT_DAY_SCORE } from "@/lib/momentum";
import {
  type CrewState,
  type FeedEntry,
  type LeaderboardRow,
  getStandingLine,
  reactionGlyphs,
  reactionLabels,
} from "@/lib/crew";
import { shiftDate } from "@/lib/fitness";
import type { RegionalPreferences } from "@/lib/preferences";
import {
  reactToDayAction,
  removeCrewMemberAction,
  respondToCrewRequestAction,
} from "@/app/crew/actions";

/**
 * Everything the crew page shows, given data it does not fetch itself — so the
 * board can be rendered and looked at without an account behind it.
 */
export function CrewBoard({
  calendar,
  crew,
  feed,
  leaderboard,
  today,
  userEmail,
}: {
  calendar: RegionalPreferences;
  crew: CrewState;
  feed: FeedEntry[];
  leaderboard: LeaderboardRow[];
  today: string;
  userEmail: string;
}) {
  const incoming = crew.requests.filter(
    (request) => request.direction === "incoming",
  );
  const outgoing = crew.requests.filter(
    (request) => request.direction === "outgoing",
  );

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation
        active="crew"
        profile={calendar}
        userEmail={userEmail}
      />

      <div className="page-container flex flex-col gap-8 py-7 md:py-10">
        <header className="settle-in">
          <p className="label-caps text-muted-foreground">Crew</p>
          <h1 className="mt-2 text-[30px] font-bold leading-9 tracking-[-0.03em] sm:text-[34px]">
            {crew.members.length === 0
              ? "Nobody is watching yet."
              : `${crew.members.length} ${
                  crew.members.length === 1 ? "person" : "people"
                } see your days.`}
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            They see a score, an altitude, a tier and how many rings closed.
            Never a task, a session, or a number with a currency on it.
          </p>
        </header>

        <CrewCodePanel code={crew.code} />

        {incoming.length > 0 ? (
          <TintPanel className="flex flex-col gap-3" system="plum">
            <p className="label-caps text-plum-ink">
              {incoming.length} waiting on you
            </p>
            <ul className="flex flex-col gap-2">
              {incoming.map((request) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3"
                  key={request.friendshipId}
                >
                  <span className="text-[14px] font-semibold">
                    {request.displayName}
                  </span>
                  <span className="flex gap-2">
                    <form action={respondToCrewRequestAction}>
                      <input
                        name="friendshipId"
                        type="hidden"
                        value={request.friendshipId}
                      />
                      <input name="intent" type="hidden" value="accept" />
                      <PendingSubmitButton className="ui-button ui-button--primary h-9 min-h-9 px-4 text-[12px]">
                        Accept
                      </PendingSubmitButton>
                    </form>
                    <form action={respondToCrewRequestAction}>
                      <input
                        name="friendshipId"
                        type="hidden"
                        value={request.friendshipId}
                      />
                      <input name="intent" type="hidden" value="decline" />
                      <PendingSubmitButton className="ui-button ui-button--secondary h-9 min-h-9 px-4 text-[12px]">
                        Decline
                      </PendingSubmitButton>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </TintPanel>
        ) : null}

        <section aria-labelledby="crew-table" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2
              className="text-[20px] font-bold tracking-[-0.02em]"
              id="crew-table"
            >
              This week
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {getStandingLine(leaderboard)}
            </p>
          </div>

          <TintPanel padding="sm">
            <ol className="flex flex-col">
              {leaderboard.map((row) => (
                <li
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
                    row.isYou ? "bg-plum-tint" : ""
                  }`}
                  key={row.userId}
                >
                  <span
                    className={`metric-value w-7 text-[15px] font-bold ${
                      row.position === 1 ? "text-plum" : "text-muted-foreground"
                    }`}
                  >
                    {row.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                    {row.displayName}
                    {row.isYou ? (
                      <span className="ml-2 text-[12px] font-medium text-muted-foreground">
                        you
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {Array.from({ length: 7 }, (_, index) => (
                      <span
                        aria-hidden="true"
                        className={`size-2 rounded-full ${
                          index < row.daysInOrbit
                            ? "bg-plum"
                            : "bg-muted-foreground/20"
                        }`}
                        key={index}
                      />
                    ))}
                  </span>
                  <span className="metric-value w-10 text-right text-[14px] font-bold">
                    {row.daysInOrbit}
                  </span>
                </li>
              ))}
            </ol>
          </TintPanel>
        </section>

        <section aria-labelledby="crew-feed" className="flex flex-col gap-4">
          <h2
            className="text-[20px] font-bold tracking-[-0.02em]"
            id="crew-feed"
          >
            Lately
          </h2>

          {feed.length === 0 ? (
            <TintPanel className="flex items-center gap-4" system="quiet">
              <Pip
                burn={0.2}
                className="shrink-0"
                mood={crew.members.length === 0 ? "asleep" : "grounded"}
                size={56}
              />
              <div>
              <p className="text-[14px] font-semibold">
                {crew.members.length === 0
                  ? "Your crew is empty."
                  : "Nothing published yet."}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {crew.members.length === 0
                  ? "Send someone your code. Two people is already a race."
                  : "A day shows up here once they open Orbit on it."}
              </p>
              </div>
            </TintPanel>
          ) : (
            <ul className="flex flex-col gap-3">
              {feed.map((entry) => (
                <li key={`${entry.userId}-${entry.day}`}>
                  <TintPanel className="flex flex-col gap-3" padding="sm">
                    <div className="flex items-start gap-3 px-1 pt-1">
                      <CrewAvatar
                        name={entry.displayName}
                        score={entry.snapshot.score}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold tracking-[-0.02em]">
                          {entry.headline}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {formatFeedDay(entry.day, today, calendar.locale)} ·{" "}
                          {entry.tier.name} · altitude {entry.snapshot.altitude}
                          {entry.snapshot.streak > 0
                            ? ` · ${entry.snapshot.streak} day run`
                            : ""}
                        </p>
                      </div>
                      <Badge variant={entry.snapshot.score >= 50 ? "fitness" : "muted"}>
                        {entry.snapshot.score}%
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2 px-1 pb-1">
                      {entry.reactions.map((reaction) => (
                        <form
                          action={reactToDayAction}
                          key={reaction.kind}
                        >
                          <input name="day" type="hidden" value={entry.day} />
                          <input name="kind" type="hidden" value={reaction.kind} />
                          <input name="toUser" type="hidden" value={entry.userId} />
                          <PendingSubmitButton
                            ariaLabel={`${reactionLabels[reaction.kind]} on ${entry.displayName}'s ${entry.day}`}
                            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition ${
                              reaction.mine
                                ? "bg-plum-tint text-plum-ink"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                            pendingLabel="…"
                          >
                            <span aria-hidden="true">
                              {reactionGlyphs[reaction.kind]}
                            </span>
                            {reaction.count > 0 ? reaction.count : ""}
                          </PendingSubmitButton>
                        </form>
                      ))}
                    </div>
                  </TintPanel>
                </li>
              ))}
            </ul>
          )}
        </section>

        {crew.members.length > 0 || outgoing.length > 0 ? (
          <section aria-labelledby="crew-members" className="flex flex-col gap-4">
            <h2
              className="text-[20px] font-bold tracking-[-0.02em]"
              id="crew-members"
            >
              Your crew
            </h2>
            <TintPanel className="flex flex-col gap-2" padding="sm">
              {crew.members.map((member) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                  key={member.friendshipId}
                >
                  <span className="truncate text-[14px] font-semibold">
                    {member.displayName}
                  </span>
                  <form action={removeCrewMemberAction}>
                    <input
                      name="friendshipId"
                      type="hidden"
                      value={member.friendshipId}
                    />
                    <PendingSubmitButton className="ui-button h-9 min-h-9 px-3 text-[12px] text-muted-foreground hover:text-foreground">
                      Remove
                    </PendingSubmitButton>
                  </form>
                </div>
              ))}
              {outgoing.map((request) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                  key={request.friendshipId}
                >
                  <span className="truncate text-[14px] text-muted-foreground">
                    {request.displayName} · waiting
                  </span>
                  <form action={removeCrewMemberAction}>
                    <input
                      name="friendshipId"
                      type="hidden"
                      value={request.friendshipId}
                    />
                    <PendingSubmitButton className="ui-button h-9 min-h-9 px-3 text-[12px] text-muted-foreground hover:text-foreground">
                      Cancel
                    </PendingSubmitButton>
                  </form>
                </div>
              ))}
            </TintPanel>
          </section>
        ) : null}
      </div>
    </main>
  );
}

/** The face of a day: initials, ringed by how much of that day was done. */
function CrewAvatar({ name, score }: { name: string; score: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const held = score >= ORBIT_DAY_SCORE;

  return (
    <span aria-hidden="true" className="relative grid size-11 shrink-0 place-items-center">
      <svg className="absolute inset-0 size-11 -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          fill="none"
          r="20"
          stroke="var(--muted)"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          fill="none"
          pathLength={100}
          r="20"
          stroke={held ? "var(--plum)" : "var(--muted-foreground)"}
          strokeDasharray={`${Math.max(0, Math.min(100, score))} 100`}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
      <span className="text-[13px] font-bold tracking-[-0.01em]">{initials}</span>
    </span>
  );
}

function formatFeedDay(day: string, today: string, locale: string) {
  if (day === today) return "Today";
  if (day === shiftDate(today, -1)) return "Yesterday";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(`${day}T12:00:00Z`));
}
