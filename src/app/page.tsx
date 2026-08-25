import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  AnalyticsCard,
  FinanceCard,
  FitnessCard,
  MomentumCard,
  ReviewCard,
  RingsCard,
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
  getFinanceSummary,
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
import { getPinnedFinanceMetric } from "@/lib/finance-metric";
import {
  getDayCard,
  getGhostRace,
  getMomentum,
  getMomentumRecords,
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
  sortDashboardTasks,
} from "@/lib/tasks";

export const dynamic = "force-dynamic";

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
  const historyFrom = shiftDate(today, -59);
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
  const finance = getFinanceSummary(transactions, today.slice(0, 7));
  const dailyRings = getDailyRings(
    visibleTasks,
    fitnessStats.todayTraining,
    transactions,
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
  const quickTasks = filterTasks(
    pinnedTasks,
    filter,
    today,
    calendar.timeZone,
  ).slice(0, 4);
  const pinnedTaskStats = getTaskStats(pinnedTasks);
  const nextTask = orderedTasks.find((task) => !task.completed);
  const pendingFinance = [...transactions]
    .filter((transaction) => transaction.status !== "paid")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const pinnedFinance = getPinnedFinanceMetric(
    preferences.pinnedFinanceMetric,
    finance,
  );
  const activeTodayAreas = Object.values(dailyRings).filter(
    (area) => area.total > 0,
  );
  const completedTodayAreas = activeTodayAreas.filter(
    (area) => area.percent >= 100,
  ).length;
  const todaySectionDetail = activeTodayAreas.length > 0
    ? `${completedTodayAreas} of ${activeTodayAreas.length} active areas are complete today.`
    : "No task, training, or cleared-finance activity is planned for today.";
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
        key="analytics"
        overviewQuery={overviewQuery}
        productivity={productivity}
        rangeDays={preferences.rangeDays}
        review={review}
        today={today}
      />
    ),
    finance: (
      <FinanceCard
        finance={finance}
        key="finance"
        pendingFinance={pendingFinance}
        pinnedFinance={pinnedFinance}
      />
    ),
    fitness: (
      <FitnessCard key="fitness" training={fitnessStats.todayTraining} />
    ),
    momentum: (
      <MomentumCard
        dayCard={dayCard}
        ghost={ghost}
        key="momentum"
        momentum={momentum}
        records={momentumRecords}
        streak={streak}
      />
    ),
    review: (
      <ReviewCard key="review" reflection={reflection} review={review} />
    ),
    rings: (
      <RingsCard
        dailyRings={dailyRings}
        key="rings"
        nextTask={nextTask}
        today={today}
        timeZone={calendar.timeZone}
        training={fitnessStats.todayTraining}
      />
    ),
    tasks: (
      <TasksCard
        filter={filter}
        key="tasks"
        overviewQuery={overviewQuery}
        pinnedCategory={preferences.pinnedTaskCategory}
        quickTasks={quickTasks}
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
  const todayCards = visibleCards.filter(
    (card) => card !== "analytics" && card !== "review",
  );
  const trendCards = visibleCards.filter(
    (card) => card === "analytics" || card === "review",
  );
  const dateLabel = new Intl.DateTimeFormat(preferences.regional.locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${today}T12:00:00Z`));

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation
        active="dashboard"
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
          <div>
            <p className="label-caps text-muted-foreground">{dateLabel}</p>
            <h1 className="mt-2 text-[30px] font-bold leading-9 tracking-[-0.03em] sm:text-[34px]">
              {greeting(preferences.regional.locale, calendar.timeZone)}
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              {todaySectionDetail}
            </p>
          </div>
          <OpenDashboardSettingsButton />
        </header>

        {todayCards.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {todayCards.map((card) => dashboardCards[card])}
          </div>
        ) : null}

        {trendCards.length > 0 ? (
          <section aria-labelledby="trends-title" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2
                className="text-[20px] font-bold tracking-[-0.02em]"
                id="trends-title"
              >
                {trendsSectionTitle}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {trendsSectionDetail}
              </p>
            </div>
            <div className="grid gap-5">
              {trendCards.map((card) => dashboardCards[card])}
            </div>
          </section>
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
