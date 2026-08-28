import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import type { ReactNode } from "react";
import { DayCardShare } from "@/components/DayCardShare";
import { DayComplete } from "@/components/DayComplete";
import { RecapShare } from "@/components/RecapShare";
import { WeekSealed } from "@/components/WeekSealed";
import { Arrival } from "@/components/Arrival";
import { DayTiles } from "@/components/overview/DayTiles";
import { VoyageCard } from "@/components/overview/VoyageCard";
import { WeekStrip } from "@/components/overview/WeekStrip";
import {
  AnalyticsCard,
  FitnessCard,
  MilestonesCard,
  MomentumCard,
  PipGreeting,
  RecapCard,
  ReviewCard,
  RingsCard,
  SetupCard,
  TasksCard,
  greeting,
} from "@/components/overview/cards";
import { AppNavigation } from "@/components/AppNavigation";
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
import { OpenDashboardSettingsButton } from "@/components/OpenDashboardSettingsButton";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type ProductivityDomain,
  getDailyRings,
  getProductivityHistory,
  getProductivityRange,
  getProductivityWeeks,
  getWeeklyReflection,
  getWeeklyReview,
  rescoreProductivity,
} from "@/lib/dashboard";
import {
  createUnconfiguredWeeklyPlan,
  ensureFitnessPlan,
  getFitnessPlanHistory,
  getFitnessSessions,
  getFitnessStats,
  getWeekDateKeys,
  shiftDate,
} from "@/lib/fitness";
import {
  getFinanceTransactions,
} from "@/lib/finance";
import {
  type DashboardCardId,
  getDashboardPreferences,
} from "@/lib/preferences";
import type {
  OverviewQueryState,
  OverviewTaskFilter,
} from "@/lib/overview-query";
import { getAscent } from "@/lib/ascent";
import { hasCrew, publishSnapshot } from "@/lib/crew";
import { getRecapWeek, getWeekRecap } from "@/lib/recap";
import { daysOut, getVoyage } from "@/lib/voyage";
import {
  getEarnedToday,
  getMilestones,
  getSetupState,
} from "@/lib/progression";
import {
  getDayCard,
  getGhostRace,
  getMomentum,
  getMomentumRecords,
  ORBIT_DAY_SCORE,
  getStreak,
} from "@/lib/momentum";
import {
  type Task,
  getDateInTimeZone,
  getMostUsedTaskCategories,
  getTaskCompletions,
  getTaskDayStatus,
  getTaskStats,
  getTasks,
  getVisibleTasks,
  isRepeating,
  sortDashboardTasks,
} from "@/lib/tasks";
import { isRoutineDoneOn } from "@/lib/routines";
import { getTaskReward } from "@/lib/reward";

export const dynamic = "force-dynamic";

/** Two years of days: long enough to be a voyage, bounded enough to be cheap. */
const VOYAGE_HISTORY_DAYS = 730;

export const metadata: Metadata = {
  title: "Overview",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ brief?: string; domains?: string; tasks?: string }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const params = await searchParams;
  const preferences = await getDashboardPreferences(supabase, user.id);
  const calendar = preferences.regional;
  const today = getDateInTimeZone(new Date(), preferences.regional.timeZone);
  const currentWeek = getWeekDateKeys(today, calendar.weekStartsOn);
  // The voyage counts every day Orbit has ever scored, so the window that
  // feeds it is the account, not the last two months.
  const historyFrom = shiftDate(today, -VOYAGE_HISTORY_DAYS + 1);
  const historyTo = shiftDate(today, 1);
  const [
    taskHistory,
    weeklyPlanResult,
    transactions,
    completions,
    sessions,
    fitnessPlanHistory,
    reflection,
  ] =
    await Promise.all([
      getTasks(supabase, user.id, { includeHistory: true }),
      ensureFitnessPlan(supabase, user.id, today, calendar.weekStartsOn),
      getFinanceTransactions(supabase, user.id),
      getTaskCompletions(supabase, user.id, historyFrom, historyTo),
      getFitnessSessions(supabase, user.id, historyFrom, historyTo),
      getFitnessPlanHistory(supabase, user.id, historyFrom, historyTo),
      getWeeklyReflection(supabase, user.id, currentWeek[0]),
    ]);
  const visibleTasks = getVisibleTasks(taskHistory, today, calendar.timeZone);
  const orderedTasks = sortDashboardTasks(
    visibleTasks,
    today,
    calendar.timeZone,
  );
  const fitnessConfigured = Boolean(weeklyPlanResult);
  const weeklyPlan =
    weeklyPlanResult ??
    createUnconfiguredWeeklyPlan(today, calendar.weekStartsOn);
  const fitnessStats = getFitnessStats(
    weeklyPlan,
    today,
    fitnessConfigured,
  );
  const dailyRings = getDailyRings(
    visibleTasks,
    completions,
    fitnessStats.todayTraining,
    today,
    calendar.timeZone,
  );
  const enabledDomains = getEnabledDomains(params.domains);
  const productivity = rescoreProductivity(
    getProductivityRange(
      taskHistory,
      completions,
      sessions,
      fitnessPlanHistory,
      today,
      preferences.rangeDays,
      calendar,
    ),
    enabledDomains,
    preferences.scoring,
  );
  const weeklyProductivity = rescoreProductivity(
    getProductivityWeeks(
      taskHistory,
      completions,
      sessions,
      fitnessPlanHistory,
      today,
      calendar,
    ),
    enabledDomains,
    preferences.scoring,
  );
  const review = getWeeklyReview(
    taskHistory,
    completions,
    sessions,
    transactions,
    weeklyProductivity,
    today,
    calendar,
  );
  const momentumRange = rescoreProductivity(
    getProductivityRange(
      taskHistory,
      completions,
      sessions,
      fitnessPlanHistory,
      today,
      30,
      calendar,
    ),
    enabledDomains,
    preferences.scoring,
  );
  const momentum = getMomentum(momentumRange.current, today);
  const streak = getStreak(momentumRange.current, today);
  const momentumRecords = getMomentumRecords(momentumRange.current, today);
  const ghost = getGhostRace(
    weeklyProductivity.current,
    weeklyProductivity.previous,
    today,
  );
  const dayCard = getDayCard({ date: today, ghost, momentum, streak });
  const voyage = getVoyage(
    rescoreProductivity(
      {
        current: getProductivityHistory(
          taskHistory,
          completions,
          sessions,
          fitnessPlanHistory,
          today,
          VOYAGE_HISTORY_DAYS,
          calendar,
        ),
        previous: [],
      },
      enabledDomains,
      preferences.scoring,
    ).current,
  );
  // Only the newest arrival is worth interrupting for, and only while it is
  // still news.
  const arrival = voyage.arrivals[voyage.arrivals.length - 1];
  const freshArrival =
    arrival && arrival.date >= shiftDate(today, -1) ? arrival : null;
  // Last week, out of the thirty days already loaded for momentum: no extra
  // query, and no recap table to fall out of sync with the days themselves.
  const recapWeek = getRecapWeek(today, calendar.weekStartsOn);
  const recap = getWeekRecap({
    fresh: recapWeek.fresh,
    locale: calendar.locale,
    points: momentumRange.current,
    weekEnd: recapWeek.weekEnd,
    weekStart: recapWeek.weekStart,
  });
  const setup = getSetupState({
    fitnessConfigured,
    hasOrbitDay: momentumRange.current.some(
      (point) => (point.score ?? 0) >= ORBIT_DAY_SCORE,
    ),
    taskCount: taskHistory.length,
  });
  const milestones = getMilestones({
    bestAltitude: momentumRecords.bestAltitude,
    bestDay: momentumRecords.bestDay,
    bestStreak: streak.bestStreak,
    orbitDays: momentumRecords.orbitDays,
  });
  const ringsClosedToday = Object.values(dailyRings).filter(
    (area) => area.total > 0 && area.percent >= 100,
  ).length;
  const ringsActiveToday = Object.values(dailyRings).filter(
    (area) => area.total > 0,
  ).length;
  const dayAscent = getAscent({
    areas: [
      { ...dailyRings.tasks, label: "Tasks", system: "tasks" as const },
      { ...dailyRings.fitness, label: "Fitness", system: "fitness" as const },
    ],
    todayScore: momentum.todayScore,
  });
  const earnedToday = getEarnedToday({
    ringsClosed: ringsClosedToday,
    ringsTotal: ringsActiveToday,
    todayScore: momentum.todayScore,
  });

  // The crew sees a published day, never the data underneath it — and nothing
  // is published at all for an account with nobody in its crew.
  if (await hasCrew(supabase)) {
    await publishSnapshot(supabase, {
      altitude: momentum.projected,
      day: today,
      ringsClosed: ringsClosedToday,
      ringsTotal: ringsActiveToday,
      score: momentum.todayScore ?? 0,
      streak: streak.streak,
      tierId: momentum.tier.id,
    });
  }
  const briefMode = params.brief === "weekly" ? "weekly" : "daily";
  const filter = getTaskFilter(params.tasks);
  const overviewQuery: OverviewQueryState = {
    brief: briefMode,
    domains: params.domains,
    tasks: filter,
  };
  const categoryOptions = [
    ...new Set([
      preferences.pinnedTaskCategory,
      ...getMostUsedTaskCategories(taskHistory, 20),
    ]),
  ].filter(Boolean);
  const pinnedTasks = preferences.pinnedTaskCategory
    ? orderedTasks.filter(
        (task) =>
          task.category.toLocaleLowerCase() ===
          preferences.pinnedTaskCategory.toLocaleLowerCase(),
      )
    : orderedTasks;
  // Six rather than four: the card's job is to answer "what is on today",
  // and four with three filters above them answered "some of it".
  const quickTasks = filterTasks(
    pinnedTasks,
    filter,
    today,
    calendar.timeZone,
  ).slice(0, 6);
  const pinnedTaskStats = getTaskStats(pinnedTasks);
  // A routine is done for a date, so today's completions decide whether it is
  // still asking for something.
  const doneToday = new Set(
    orderedTasks
      .filter(
        (task) => isRepeating(task) && isRoutineDoneOn(completions, task.id, today),
      )
      .map((task) => task.id),
  );
  // What each open task is worth right now, in the same kilometres the voyage
  // counts, so the reward on the button is the reward on the map.
  const todayPoint = weeklyProductivity.current.find(
    (point) => point.date === today,
  );
  const taskRewards = Object.fromEntries(
    todayPoint
      ? orderedTasks.map((task) => [
          task.id,
          getTaskReward(todayPoint, task, enabledDomains, preferences.scoring),
        ])
      : [],
  );
  const trendsSectionTitle = enabledDomains.length > 0
    ? `Weekly score: ${review.score}%`
    : "Productivity scoring is paused";
  const trendsSectionDetail = enabledDomains.length > 0
    ? `${preferences.rangeDays}-day productivity and this week’s review show the current direction.`
    : "Enable tasks, fitness, or focus to restore score comparisons.";
  const dashboardCards: Record<DashboardCardId, ReactNode> = {
    analytics: (
      <AnalyticsCard
        enabledDomains={enabledDomains}
        ghost={ghost}
        key="analytics"
        overviewQuery={overviewQuery}
        productivity={productivity}
        rangeDays={preferences.rangeDays}
        records={momentumRecords}
        review={review}
        streak={streak}
        today={today}
        weekChange={momentum.weekChange}
      />
    ),
    fitness: (
      <FitnessCard key="fitness" training={fitnessStats.todayTraining} />
    ),
    momentum: (
      <MomentumCard
        dayCard={dayCard}
        key="momentum"
        momentum={momentum}
        streak={streak}
      />
    ),
    review: (
      <ReviewCard key="review" reflection={reflection} review={review} />
    ),
    milestones: <MilestonesCard key="milestones" milestones={milestones} />,
    voyage: <VoyageCard key="voyage" locale={calendar.locale} voyage={voyage} />,
    recap: recap ? <RecapCard key="recap" recap={recap} /> : null,
    rings: (
      <RingsCard
        dailyRings={dailyRings}
        earned={earnedToday}
        key="rings"
        todayScore={momentum.todayScore}
      />
    ),
    tasks: (
      <TasksCard
        doneToday={[...doneToday]}
        key="tasks"
        pinnedCategory={preferences.pinnedTaskCategory}
        quickTasks={quickTasks}
        rewards={taskRewards}
        taskStats={pinnedTaskStats}
        today={today}
        timeZone={calendar.timeZone}
        total={pinnedTasks.length}
      />
    ),
  };
  const visibleCards = preferences.cardOrder.filter(
    (card) => !preferences.hiddenCards.includes(card),
  );
  const trendCardIds: DashboardCardId[] = [
    "analytics",
    "milestones",
    "voyage",
    "recap",
    "review",
  ];
  // The tiles answer the glance; the list answers "which ones". Everything
  // else is detail, and detail goes under the fold.
  const listCards = visibleCards.filter((card) => card === "tasks");
  // Momentum is the hero above, and the tasks list sits under the tiles; what
  // is left is detail, and detail goes under the fold.
  const foldedCards = visibleCards.filter(
    (card) =>
      card !== "tasks" && card !== "momentum" && !trendCardIds.includes(card),
  );
  const trendCards = visibleCards.filter((card) => trendCardIds.includes(card));
  const dateLabel = new Intl.DateTimeFormat(preferences.regional.locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${today}T12:00:00Z`));

  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation
        active="dashboard"
        theme={theme}
        profile={preferences.regional}
        settings={(
          <DashboardCustomizer
            categories={categoryOptions}
            preferences={preferences}
          />
        )}
        userEmail={user.email ?? "Orbit user"}
      />

      <div className="page-container flex flex-col gap-8 py-7 md:py-10">
        <header className="settle-in flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="label-caps text-muted-foreground">{dateLabel}</p>
            <div className="mt-2">
              <PipGreeting
                allClosed={earnedToday.allClosed}
                altitude={momentum.projected}
                streak={streak.streak}
                todayScore={momentum.todayScore}
              >
                <h1 className="text-[30px] font-bold leading-9 tracking-[-0.03em] sm:text-[34px]">
                  {greeting(preferences.regional.locale, calendar.timeZone)}
                </h1>
              </PipGreeting>
            </div>
          </div>
          <OpenDashboardSettingsButton />
        </header>

        {earnedToday.allClosed ? (
          <DayComplete
            altitude={momentum.projected}
            ascent={dayAscent}
            date={today}
            streak={streak.streak}
            tier={momentum.tier.name}
          >
            <DayCardShare
              altitude={dayCard.altitude}
              date={dayCard.date}
              ghost={dayCard.ghost}
              metrics={dayCard.metrics}
              mood="sealed"
              tierColor={dayCard.tier.color}
              tierName={dayCard.tier.name}
              trace={momentum.series.slice(-14).map((point) => point.altitude)}
            />
          </DayComplete>
        ) : null}

        {freshArrival ? (
          <Arrival
            arrival={freshArrival}
            daysTaken={daysOut(voyage.startedOn, freshArrival.date)}
            distance={voyage.distance}
          />
        ) : null}

        {recap && recap.fresh ? (
          <WeekSealed recap={recap}>
            <RecapShare
              altitudeChange={recap.altitudeChange}
              days={recap.days}
              headline={recap.headline}
              isBestWeek={recap.isBestWeek}
              label={recap.label}
              mood={recap.mood}
              stats={recap.stats}
              tierColor={recap.tier.color}
              tierName={recap.tier.name}
              verdict={recap.verdict}
              weekStart={recap.weekStart}
            />
          </WeekSealed>
        ) : null}

        <SetupCard setup={setup} />

        {/* The week first, because "which day am I in" is answered before
            anything else is read, and then the day itself as four tiles. */}
        <WeekStrip
          locale={calendar.locale}
          points={weeklyProductivity.current}
          today={today}
        />

        {/* How the day is going, first and large: the altitude, and the climb
            today has actually drawn. */}
        {dashboardCards.momentum}

        <DayTiles
          taskStats={pinnedTaskStats}
          training={fitnessStats.todayTraining}
        />

        {listCards.map((card) => dashboardCards[card])}

        {/* The history is worth having and is not worth reading first: the
            day is the point, and five charts under it is why the page felt
            like homework. It states its headline and opens when asked. */}
        {trendCards.length + foldedCards.length > 0 ? (
          <details className="settle-in rounded-2xl border border-border bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted">
              <h2
                className="text-[16px] font-bold tracking-[-0.02em]"
                id="trends-title"
              >
                {trendsSectionTitle}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {trendsSectionDetail}
              </p>
            </summary>
            <div className="grid gap-5 border-t border-border p-4">
              {foldedCards.map((card) => dashboardCards[card])}
              {trendCards.map((card) => dashboardCards[card])}
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}

function getTaskFilter(value: string | undefined): OverviewTaskFilter {
  return value === "overdue" || value === "upcoming" ? value : "today";
}

function filterTasks(
  tasks: Task[],
  filter: OverviewTaskFilter,
  today: string,
  timeZone: string,
) {
  if (filter === "overdue") {
    return tasks.filter(
      (task) => getTaskDayStatus(task, today, timeZone) === "overdue",
    );
  }
  if (filter === "upcoming") {
    return tasks.filter(
      (task) => getTaskDayStatus(task, today, timeZone) === "scheduled",
    );
  }
  return tasks.filter((task) => {
    const status = getTaskDayStatus(task, today, timeZone);
    return status === "today" || status === "completed";
  });
}

function getEnabledDomains(value: string | undefined): ProductivityDomain[] {
  if (value === "none") return [];
  if (!value) return ["tasks", "fitness", "focus"];
  const valid: ProductivityDomain[] = ["tasks", "fitness", "focus"];
  return valid.filter((domain) => value.split(",").includes(domain));
}
