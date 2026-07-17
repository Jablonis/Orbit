import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ActivityRings } from "@/components/ActivityRings";
import { AppNavigation } from "@/components/AppNavigation";
import { DashboardCustomizer } from "@/components/DashboardCustomizer";
import { EmptyState } from "@/components/EmptyState";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { QuickAdd } from "@/components/QuickAdd";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type ProductivityPoint,
  type ProductivityDomain,
  type WeeklyReflection,
  type WeeklyReview,
  getDailyRings,
  getProductivityRange,
  getProductivityWeeks,
  getWeeklyReflection,
  getWeeklyReview,
  rescoreProductivity,
} from "@/lib/dashboard";
import {
  ensureFitnessPlan,
  getFitnessSessions,
  getFitnessStats,
  getWeekDateKeys,
  shiftDate,
  sportLabels,
} from "@/lib/fitness";
import {
  formatCurrency,
  getFinanceSummary,
  getFinanceTransactions,
} from "@/lib/finance";
import {
  type DashboardCardId,
  type PinnedFinanceMetric,
  getDashboardPreferences,
} from "@/lib/preferences";
import {
  type Task,
  formatRelativeTaskDate,
  getDateInTimeZone,
  getMostUsedTaskCategories,
  getTaskCompletions,
  getTaskDayStatus,
  getTaskStats,
  getTasks,
  getVisibleTasks,
  sortDashboardTasks,
} from "@/lib/tasks";
import { saveWeeklyReflectionAction } from "./actions";
import { toggleFitnessDoneFormAction } from "./fitness/actions";
import { toggleTaskAction } from "./tasks/actions";

export const dynamic = "force-dynamic";

type TaskFilter = "today" | "overdue" | "upcoming";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ brief?: string; domains?: string; tasks?: string }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const params = await searchParams;
  const today = getDateInTimeZone();
  const currentWeek = getWeekDateKeys(today);
  const historyFrom = shiftDate(today, -59);
  const historyTo = shiftDate(today, 1);
  const [
    taskHistory,
    weeklyPlan,
    transactions,
    completions,
    sessions,
    reflection,
    preferences,
  ] =
    await Promise.all([
      getTasks(supabase, user.id, { includeHistory: true }),
      ensureFitnessPlan(supabase, user.id, today),
      getFinanceTransactions(supabase, user.id),
      getTaskCompletions(supabase, user.id, historyFrom, historyTo),
      getFitnessSessions(supabase, user.id, historyFrom, historyTo),
      getWeeklyReflection(supabase, user.id, currentWeek[0]),
      getDashboardPreferences(supabase, user.id),
    ]);
  const visibleTasks = getVisibleTasks(taskHistory, today);
  const orderedTasks = sortDashboardTasks(visibleTasks, today);
  const fitnessStats = getFitnessStats(weeklyPlan, today);
  const finance = getFinanceSummary(transactions);
  const dailyRings = getDailyRings(
    visibleTasks,
    fitnessStats.todayTraining,
    transactions,
    today,
  );
  const enabledDomains = getEnabledDomains(params.domains);
  const productivity = rescoreProductivity(
    getProductivityRange(
      taskHistory,
      completions,
      sessions,
      weeklyPlan,
      today,
      preferences.rangeDays,
    ),
    enabledDomains,
  );
  const weeklyProductivity = rescoreProductivity(
    getProductivityWeeks(
      taskHistory,
      completions,
      sessions,
      weeklyPlan,
      today,
    ),
    enabledDomains,
  );
  const review = getWeeklyReview(
    taskHistory,
    completions,
    sessions,
    transactions,
    weeklyProductivity,
    today,
  );
  const briefMode = params.brief === "weekly" ? "weekly" : "daily";
  const filter = getTaskFilter(params.tasks);
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
  const quickTasks = filterTasks(pinnedTasks, filter, today).slice(0, 4);
  const pinnedTaskStats = getTaskStats(pinnedTasks);
  const nextTask = orderedTasks.find((task) => !task.completed);
  const pendingFinance = [...transactions]
    .filter((transaction) => transaction.status !== "paid")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const pinnedFinance = getPinnedFinanceMetric(
    preferences.pinnedFinanceMetric,
    finance,
  );
  const dashboardCards: Record<DashboardCardId, ReactNode> = {
    analytics: (
      <AnalyticsCards
        enabledDomains={enabledDomains}
        filter={filter}
        key="analytics"
        monthlyCashflow={finance.monthlyCashflow}
        productivity={productivity}
        rangeDays={preferences.rangeDays}
        today={today}
      />
    ),
    finance: (
      <FinanceSummaryCard
        finance={finance}
        key="finance"
        pinnedFinance={pinnedFinance}
      />
    ),
    fitness: (
      <FitnessTodayCard key="fitness" training={fitnessStats.todayTraining} />
    ),
    review: (
      <WeeklyReviewCard key="review" reflection={reflection} review={review} />
    ),
    rings: <DailyRingsCard dailyRings={dailyRings} key="rings" />,
    tasks: (
      <QuickTasksCard
        domainParam={params.domains}
        filter={filter}
        key="tasks"
        pinnedCategory={preferences.pinnedTaskCategory}
        quickTasks={quickTasks}
        taskStats={pinnedTaskStats}
        today={today}
        total={pinnedTasks.length}
      />
    ),
  };
  const visibleCardOrder = preferences.cardOrder.filter(
    (card) => !preferences.hiddenCards.includes(card),
  );
  const todayCardOrder = visibleCardOrder.filter(
    (card) => card !== "analytics" && card !== "review",
  );
  const trendCardOrder = visibleCardOrder.filter(
    (card) => card === "analytics" || card === "review",
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--canvas)] pb-28 text-[var(--text-primary)] md:pb-12 md:pl-[112px]">
      <AppNavigation
        active="dashboard"
        settings={(
          <DashboardCustomizer
            categories={categoryOptions}
            preferences={preferences}
          />
        )}
        userEmail={user.email ?? "Orbit user"}
      />
      <section className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
        <header className="overview-intro-enter mb-6 pr-14 md:pr-0">
          <div>
            <p className="label-caps text-[var(--accent-primary)]">Overview</p>
            <h1 className="page-title mt-2 text-white">
              Your day, clearly.
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
              What matters now, today&apos;s progress, and the trends worth keeping.
            </p>
          </div>
        </header>

        <BriefHero
          dailyHref={getBriefHref("daily", params)}
          dailyRings={dailyRings}
          mode={briefMode}
          nextTask={nextTask}
          pendingFinance={pendingFinance}
          review={review}
          today={today}
          training={fitnessStats.todayTraining}
          weeklyHref={getBriefHref("weekly", params)}
        />

        {todayCardOrder.length > 0 ? (
          <section aria-labelledby="today-section-title" className="mt-9">
            <SectionHeading
              detail="Daily progress and the next actions you can complete."
              eyebrow="Today"
              id="today-section-title"
              title="Keep the day moving"
            />
            <div
              className={`overview-today-composition mt-4 ${
                preferences.density === "compact" ? "dashboard-density-compact" : ""
              }`}
            >
              {todayCardOrder.map((card) => dashboardCards[card])}
            </div>
          </section>
        ) : null}

        {trendCardOrder.length > 0 ? (
          <section aria-labelledby="trends-section-title" className="mt-10">
            <SectionHeading
              detail="Step back only when you need context or a course correction."
              eyebrow="Trends"
              id="trends-section-title"
              title="See the wider pattern"
            />
            <div
              className={`overview-trend-composition mt-4 ${
                preferences.density === "compact" ? "dashboard-density-compact" : ""
              }`}
            >
              {trendCardOrder.map((card) => dashboardCards[card])}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function getBriefHref(
  mode: "daily" | "weekly",
  params: { domains?: string; tasks?: string },
) {
  const query = new URLSearchParams({ brief: mode });
  if (params.domains) query.set("domains", params.domains);
  if (params.tasks) query.set("tasks", params.tasks);
  return `/?${query.toString()}`;
}

function BriefHero({
  dailyHref,
  dailyRings,
  mode,
  nextTask,
  pendingFinance,
  review,
  today,
  training,
  weeklyHref,
}: {
  dailyHref: string;
  dailyRings: ReturnType<typeof getDailyRings>;
  mode: "daily" | "weekly";
  nextTask?: Task;
  pendingFinance?: import("@/lib/finance").FinanceTransaction;
  review: WeeklyReview;
  today: string;
  training: import("@/lib/fitness").TodayTraining;
  weeklyHref: string;
}) {
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${today}T12:00:00Z`));
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/Bratislava",
    }).format(new Date()),
  );
  const phase = hour < 12
    ? { eyebrow: "Morning check-in", greeting: "Good morning", prompt: "Set the tone for today." }
    : hour < 18
      ? { eyebrow: "Midday check-in", greeting: "Good afternoon", prompt: "Keep the useful momentum." }
      : { eyebrow: "Evening check-in", greeting: "Good evening", prompt: "Close the day with intention." };
  const activeAreas = Object.values(dailyRings).filter((area) => area.total > 0);
  const areasOnTrack = activeAreas.filter((area) => area.percent >= 100).length;
  const progressSummary = activeAreas.length
    ? `${areasOnTrack} of ${activeAreas.length} active areas complete today.`
    : "Nothing is demanding attention yet today.";
  const primaryAction = nextTask
    ? { href: "/tasks", label: "Open next task" }
    : training.day.sport !== "rest" && !training.day.log.completed
      ? { href: "/fitness#training-calendar", label: "Log workout" }
      : { href: "/tasks#new-task", label: "Plan the next move" };
  const dailyProgress = activeAreas.length
    ? Math.round(activeAreas.reduce((total, area) => total + Math.min(area.percent, 100), 0) / activeAreas.length)
    : 0;
  const briefProgress = mode === "daily" ? dailyProgress : review.score;

  return (
    <section aria-labelledby="brief-title" className="hero-panel overview-brief-enter relative z-30 overflow-visible rounded-[var(--radius-panel)] p-5 sm:p-6 lg:p-7">
      <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-caps text-[var(--text-tertiary)]">Orbit brief</p>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            {mode === "daily" ? "The immediate decisions." : "The pattern behind the week."}
          </p>
        </div>
        <nav aria-label="Brief period" className="inline-flex w-fit rounded-full border border-[var(--border-subtle)] bg-black/25 p-1">
          <BriefPeriodLink active={mode === "daily"} href={dailyHref} label="Daily" />
          <BriefPeriodLink active={mode === "weekly"} href={weeklyHref} label="Weekly" />
        </nav>
      </div>
      <OrbitDatum value={briefProgress} />
      {mode === "daily" ? (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-stretch">
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <p className="label-caps text-[var(--accent-primary)]">
              {phase.eyebrow} · {dateLabel}
            </p>
            <h2 className="editorial-display mt-3 max-w-3xl text-[32px] leading-[37px] text-white sm:text-[42px] sm:leading-[47px]" id="brief-title">
              {phase.greeting}. {phase.prompt}
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
              {progressSummary}
            </p>
          </div>

          <div className="mt-6 rounded-[var(--radius-row)] border border-[var(--border-subtle)] bg-black/20 p-4 sm:p-5">
            <p className="label-caps text-[var(--text-tertiary)]">Next clear move</p>
            <p className="mt-2 text-[18px] font-semibold leading-6 text-white sm:text-[20px]">
              {nextTask?.title ?? (training.day.sport !== "rest" ? training.title : "Your schedule is clear")}
            </p>
            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
              {nextTask
                ? `${nextTask.category} · ${formatRelativeTaskDate(nextTask, today)}`
                : training.day.sport !== "rest"
                  ? `${training.day.log.durationMinutes} min planned · ${training.focus}`
                  : "Add something only if it deserves your attention."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-primary)] px-5 text-[13px] font-bold text-[#111112] transition duration-150 hover:brightness-105"
                href={primaryAction.href}
              >
                {primaryAction.label}
                <LinkPendingIndicator label={`Opening ${primaryAction.label}`} />
              </Link>
              <QuickAdd />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <HeroSignal
            detail={training.day.log.completed ? "Session complete" : training.day.sport === "rest" ? "Recovery day" : `${training.day.log.durationMinutes} min planned`}
            href="/fitness#training-calendar"
            label="Workout"
            tone="lime"
            value={training.title}
          />
          <HeroSignal
            detail={pendingFinance ? `${pendingFinance.date} · ${formatCurrency(pendingFinance.amount)}` : "Cashflow is up to date"}
            href="/finance"
            label="Finance"
            tone="blue"
            value={pendingFinance?.title ?? "No pending items"}
          />
        </div>
      </div>
      ) : (
        <WeeklyBriefBody review={review} today={today} />
      )}
    </section>
  );
}

function BriefPeriodLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-9 items-center justify-center rounded-full px-4 text-[12px] font-semibold transition ${
        active
          ? "bg-white text-[#171718] shadow-sm"
          : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white"
      }`}
      href={href}
      scroll={false}
    >
      {label}
      <LinkPendingIndicator label={`Loading ${label} Brief`} />
    </Link>
  );
}

function WeeklyBriefBody({ review, today }: { review: WeeklyReview; today: string }) {
  const scoreChange = review.score - review.previousScore;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));
  const weeklyDirection = scoreChange > 0
    ? `The week is ${scoreChange} points ahead of last week.`
    : scoreChange < 0
      ? `The week is ${Math.abs(scoreChange)} points behind last week.`
      : "The week is holding level with last week.";
  const leverage = review.overdueCarried > 0
    ? `Resolve or reschedule ${review.overdueCarried} overdue task${review.overdueCarried === 1 ? "" : "s"}.`
    : "Protect what is already working and close the week cleanly.";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] xl:items-stretch">
      <div className="flex min-w-0 flex-col justify-between">
        <div>
          <p className="label-caps text-[var(--accent-focus)]">Week through {dateLabel}</p>
          <h2 className="editorial-display mt-3 max-w-3xl text-[32px] leading-[37px] text-white sm:text-[42px] sm:leading-[47px]" id="brief-title">
            {review.score}% weekly rhythm. {weeklyDirection}
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
            A compact read on execution, training, and cashflow—not another dashboard report.
          </p>
        </div>

        <div className="mt-6 rounded-[var(--radius-row)] border border-[var(--accent-focus)]/20 bg-[var(--accent-focus)]/[0.07] p-4 sm:p-5">
          <p className="label-caps text-[var(--accent-focus)]">Best weekly leverage</p>
          <p className="mt-2 text-[18px] font-semibold leading-6 text-white sm:text-[20px]">{leverage}</p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            Net cashflow {formatCurrency(review.income - review.expenses)} · {review.savingsRate}% savings rate
          </p>
          <Link
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-white px-5 text-[13px] font-bold text-[#171718] transition hover:brightness-105"
            href="#weekly-review"
          >
            Open weekly review
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <HeroSignal
          detail={`${review.overdueCarried} overdue carried`}
          href="/tasks"
          label="Task closure"
          tone="violet"
          value={`${review.completedTasks}/${review.plannedTasks} completed`}
        />
        <HeroSignal
          detail={`${review.sessionMinutes} total minutes`}
          href="/fitness#training-calendar"
          label="Training volume"
          tone="lime"
          value={`${review.sessions} session${review.sessions === 1 ? "" : "s"}`}
        />
      </div>
    </div>
  );
}

function HeroSignal({
  detail,
  href,
  label,
  tone,
  value,
}: {
  detail: string;
  href: string;
  label: string;
  tone: "blue" | "lime" | "violet";
  value: string;
}) {
  return (
    <Link
      className="overview-interactive-card group flex min-h-32 flex-col justify-between rounded-[var(--radius-row)] border border-[var(--border-subtle)] bg-white/[0.025] p-4 transition duration-150 hover:border-[var(--border-strong)] hover:bg-white/[0.045]"
      href={href}
    >
      <div>
        <p className={`label-caps ${
          tone === "lime"
            ? "text-[var(--accent-primary)]"
            : tone === "violet"
              ? "text-[var(--accent-focus)]"
              : "text-[var(--accent-info)]"
        }`}>
          {label}
        </p>
        <LinkPendingIndicator label={`Opening ${label}`} />
      </div>
      <div>
        <p className="truncate text-[15px] font-semibold text-white">{value}</p>
        <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">{detail}</p>
      </div>
    </Link>
  );
}

function OrbitDatum({ value }: { value: number }) {
  const progress = Math.max(0, Math.min(100, value));
  return (
    <div
      aria-hidden="true"
      className="orbit-datum mb-6"
      style={{ "--orbit-progress": `${progress}%` } as CSSProperties}
    >
      <span className="orbit-datum__label">0</span>
      <span className="orbit-datum__track">
        <span className="orbit-datum__progress" />
        <span className="orbit-datum__node" />
      </span>
      <span className="orbit-datum__label">100</span>
    </div>
  );
}

function SectionHeading({
  detail,
  eyebrow,
  id,
  title,
}: {
  detail: string;
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div className="overview-heading-enter section-datum flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
      <div>
        <p className="label-caps text-[var(--text-tertiary)]">{eyebrow}</p>
        <h2 className="mt-1 text-[22px] font-semibold text-white" id={id}>{title}</h2>
      </div>
      <p className="max-w-xl text-[13px] leading-5 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function DailyRingsCard({
  dailyRings,
}: {
  dailyRings: ReturnType<typeof getDailyRings>;
}) {
  const activeAreas = Object.values(dailyRings).filter((area) => area.total > 0);
  const completeAreas = activeAreas.filter((area) => area.percent >= 100).length;
  return (
    <article className="content-panel overview-card-enter overview-delay-1 relative overflow-hidden rounded-[var(--radius-panel)] p-5 sm:col-span-2 xl:col-span-7">
      <div className="relative grid gap-6 lg:grid-cols-[210px_1fr] lg:items-center">
        <div className="rounded-[34px] border border-white/10 bg-[#101011]/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <ActivityRings
            finance={dailyRings.finance.percent}
            fitness={dailyRings.fitness.percent}
            tasks={dailyRings.tasks.percent}
          />
        </div>
        <div>
          <p className="label-caps text-[#c4c7c8]">Daily rings</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-[34px] text-white">
            {activeAreas.length
              ? `${completeAreas} of ${activeAreas.length} active areas complete.`
              : "Today is clear so far."}
          </h2>
          <p className="mt-3 text-[14px] leading-6 text-[#c4c7c8]">
            All three signals use today&apos;s Bratislava calendar date and start
            fresh each morning.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <RingLegend
              color="#ff4fa3"
              href="/tasks"
              label="Tasks"
              value={`${dailyRings.tasks.completed}/${dailyRings.tasks.total} today`}
            />
            <RingLegend
              color="#a3e635"
              href="/fitness"
              label="Fitness"
              value={dailyRings.fitness.total
                ? `${dailyRings.fitness.completed}/${dailyRings.fitness.total} today`
                : "Rest day"}
            />
            <RingLegend
              color="#60a5fa"
              href="/finance"
              label="Finance"
              value={dailyRings.finance.total
                ? `${dailyRings.finance.completed}/${dailyRings.finance.total} cleared`
                : "No entries today"}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function FinanceSummaryCard({
  finance,
  pinnedFinance,
}: {
  finance: ReturnType<typeof getFinanceSummary>;
  pinnedFinance: ReturnType<typeof getPinnedFinanceMetric>;
}) {
  return (
    <article className="content-panel overview-card-enter overview-delay-2 rounded-[var(--radius-panel)] p-4 xl:col-span-5 xl:p-5">
      <p className="label-caps text-[#60a5fa]">{pinnedFinance.label}</p>
      <p className="metric-value mt-3 text-[28px] font-semibold text-white xl:mt-4 xl:text-[34px]">
        {formatCurrency(pinnedFinance.value)}
      </p>
      <p className="mt-2 text-[14px] leading-6 text-[#c4c7c8]">
        {pinnedFinance.detail}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 xl:mt-5 xl:gap-3">
        <MiniPill label="Income" value={formatCurrency(finance.income)} />
        <MiniPill label="Expense" value={formatCurrency(finance.expenses)} />
      </div>
    </article>
  );
}

function getPinnedFinanceMetric(
  metric: PinnedFinanceMetric,
  finance: ReturnType<typeof getFinanceSummary>,
) {
  if (metric === "income") {
    return {
      detail: "Paid income in the current summary period.",
      label: "Pinned income",
      value: finance.income,
    };
  }
  if (metric === "expenses") {
    return {
      detail: "Paid expenses in the current summary period.",
      label: "Pinned expenses",
      value: finance.expenses,
    };
  }
  if (metric === "net") {
    return {
      detail: "Income minus paid expenses.",
      label: "Pinned net cashflow",
      value: finance.netCashflow,
    };
  }
  return {
    detail: "Balance from paid transactions.",
    label: "Finance",
    value: finance.availableBalance,
  };
}

function FitnessTodayCard({
  training,
}: {
  training: import("@/lib/fitness").TodayTraining;
}) {
  const canComplete = training.day.sport !== "rest";
  return (
    <article className="content-panel overview-card-enter overview-delay-3 relative overflow-hidden rounded-[var(--radius-panel)] p-4 xl:col-span-5 xl:p-5">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-[#a3e635]/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-[#a3e635]">Fitness today</p>
          <h2 className="mt-3 text-[24px] font-semibold leading-[30px] text-white xl:mt-4 xl:text-[30px] xl:leading-[36px]">
            {training.title}
          </h2>
        </div>
        {canComplete ? (
          <form action={toggleFitnessDoneFormAction}>
            <input name="weekday" type="hidden" value={training.day.id} />
            <input name="sport" type="hidden" value={training.day.sport} />
            <input name="completed" type="hidden" value={String(!training.day.log.completed)} />
            <PendingSubmitButton
              ariaLabel={training.day.log.completed ? "Reopen today's fitness" : "Complete today's fitness"}
              className={`grid h-12 w-12 place-items-center rounded-full border text-[18px] font-bold transition ${
                training.day.log.completed
                  ? "border-[#a3e635]/45 bg-[#a3e635] text-[#111112]"
                  : "border-white/15 bg-[#111112] text-transparent hover:border-[#a3e635]/60 hover:text-[#a3e635]"
              }`}
              pendingLabel="…"
            >
              ✓
            </PendingSubmitButton>
          </form>
        ) : null}
      </div>
      <p className="relative mt-3 text-[14px] leading-6 text-[#c4c7c8]">
        {training.day.label} · {sportLabels[training.day.sport]}
      </p>
      <p className="relative mt-2 text-[12px] font-semibold text-[#a3e635]">
        {training.day.log.completed ? "Marked done" : canComplete ? "Ready to log" : "Recovery day"}
      </p>
      <div className="relative mt-3 rounded-[16px] border border-white/10 bg-[#201f1f]/60 p-3 xl:mt-4 xl:rounded-[18px] xl:p-4">
        <p className="text-[13px] leading-5 text-white xl:text-[14px] xl:leading-6">
          {training.focus}
        </p>
      </div>
    </article>
  );
}

function getTaskFilter(value: string | undefined): TaskFilter {
  return value === "overdue" || value === "upcoming" ? value : "today";
}

function filterTasks(tasks: Task[], filter: TaskFilter, today: string) {
  if (filter === "overdue") {
    return tasks.filter((task) => getTaskDayStatus(task, today) === "overdue");
  }
  if (filter === "upcoming") {
    return tasks.filter((task) => getTaskDayStatus(task, today) === "scheduled");
  }
  return tasks.filter((task) => {
    const status = getTaskDayStatus(task, today);
    return status === "today" || status === "completed";
  });
}

function QuickTasksCard({
  domainParam,
  filter,
  pinnedCategory,
  quickTasks,
  taskStats,
  today,
  total,
}: {
  domainParam?: string;
  filter: TaskFilter;
  pinnedCategory: string;
  quickTasks: Task[];
  taskStats: ReturnType<typeof getTaskStats>;
  today: string;
  total: number;
}) {
  return (
    <article className="content-panel overview-card-enter overview-delay-4 rounded-[var(--radius-panel)] p-5 sm:col-span-2 xl:col-span-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps text-[#ff4fa3]">Quick tasks</p>
          <h2 className="mt-2 text-[26px] font-semibold text-white">What matters next</h2>
          {pinnedCategory ? (
            <p className="mt-1 text-[11px] font-semibold text-[#ffd1e5]">
              Pinned · {pinnedCategory}
            </p>
          ) : null}
        </div>
        <Link className="text-[12px] font-bold text-[#a3e635]" href="/tasks">View all<LinkPendingIndicator label="Opening Tasks" /></Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["today", "overdue", "upcoming"] as const).map((value) => (
          <Link
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${
              value === filter
                ? "bg-white text-[#202020]"
                : "border border-white/10 text-[#c4c7c8]"
            }`}
            href={`/?tasks=${value}${domainParam ? `&domains=${encodeURIComponent(domainParam)}` : ""}`}
            key={value}
          >
            {value}
            <LinkPendingIndicator label={`Loading ${value} tasks`} />
          </Link>
        ))}
        <span className="ml-auto rounded-full bg-[#ff4fa3]/12 px-3 py-1.5 text-[11px] font-semibold text-[#ffd1e5]">
          {taskStats.completedTasksCount}/{total}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {quickTasks.map((task, index) => (
          <form
            action={toggleTaskAction}
            className="overview-row-enter grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-3 transition hover:border-white/20 hover:bg-[#262626]/70"
            key={task.id}
            style={{ animationDelay: `${240 + index * 55}ms` }}
          >
            <input name="id" type="hidden" value={task.id} />
            <input name="completed" type="hidden" value={String(!task.completed)} />
            <PendingSubmitButton
              ariaLabel={task.completed ? "Reopen task" : "Complete task"}
              className={`grid h-8 w-8 place-items-center rounded-full border text-[14px] font-bold transition ${
                task.completed
                  ? "border-[#a3e635]/45 bg-[#a3e635] text-[#111112]"
                  : "border-white/15 bg-[#111112] text-transparent hover:border-[#a3e635]/60 hover:text-[#a3e635]"
              }`}
              pendingLabel="…"
            >
              ✓
            </PendingSubmitButton>
            <div className="min-w-0">
              <p className={`truncate text-[14px] font-semibold ${task.completed ? "text-[#8d9092] line-through" : "text-white"}`}>
                {task.title}
              </p>
              <p className={`mt-0.5 text-[12px] ${getTaskDayStatus(task, today) === "overdue" ? "text-[#ff9f9f]" : "text-[#c4c7c8]"}`}>
                {task.category} · {formatRelativeTaskDate(task, today)}
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#c4c7c8]">
              {task.priority}
            </span>
          </form>
        ))}
        {quickTasks.length === 0 ? (
          <EmptyState
            actionHref="/tasks#new-task"
            actionLabel="Add a task"
            description="Choose another filter or plan the next piece of meaningful work."
            icon="✓"
            title="Your day is clear"
          />
        ) : null}
      </div>
    </article>
  );
}

function CashflowChart({ monthlyCashflow }: { monthlyCashflow: Array<{ expense: number; income: number; month: string }> }) {
  const max = Math.max(1, ...monthlyCashflow.flatMap((item) => [item.income, item.expense]));
  const latest = monthlyCashflow.at(-1);
  const previous = monthlyCashflow.at(-2);
  const difference = latest && previous
    ? latest.income - latest.expense - (previous.income - previous.expense)
    : 0;
  return (
    <article className="content-panel overview-card-enter overview-delay-5 rounded-[var(--radius-panel)] p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="label-caps text-[#60a5fa]">Cashflow</p><h2 className="mt-2 text-[22px] font-semibold text-white">Monthly movement</h2></div>
        <Link className="shrink-0 text-[12px] font-semibold text-[#a3e635]" href="/finance">Open<LinkPendingIndicator label="Opening Finance" /></Link>
      </div>
      <p className="mb-4 text-[12px] leading-[18px] text-[var(--text-secondary)]">
        {latest && previous
          ? `${latest.month} net cashflow is ${difference >= 0 ? `${formatCurrency(difference)} ahead of` : `${formatCurrency(Math.abs(difference))} behind`} ${previous.month}.`
          : latest
            ? `${latest.month} net cashflow is ${formatCurrency(latest.income - latest.expense)}.`
            : "Add finance data to unlock monthly comparisons."}
      </p>
      {monthlyCashflow.length > 0 ? (
      <div aria-label="Monthly income and expense chart" className="flex h-48 items-end gap-2">
        {monthlyCashflow.map((month, index) => (
          <div
            aria-label={`${month.month}: income ${formatCurrency(month.income)}, expenses ${formatCurrency(month.expense)}, net ${formatCurrency(month.income - month.expense)}`}
            className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-[10px] focus-visible:bg-white/[0.04]"
            key={month.month}
            role="group"
            tabIndex={0}
            title={`${month.month}: ${formatCurrency(month.income - month.expense)} net`}
          >
            <div className="flex w-full flex-1 items-end justify-center gap-1 rounded-[14px] border border-white/10 bg-[#151516] px-1.5 pb-2">
              <div className="overview-bar-enter w-full max-w-6 rounded-t-[8px] bg-[#a3e635]" style={{ animationDelay: `${180 + index * 55}ms`, height: `${(month.income / max) * 100}%` }} />
              <div className="overview-bar-enter w-full max-w-6 rounded-t-[8px] bg-[#60a5fa]/55" style={{ animationDelay: `${230 + index * 55}ms`, height: `${(month.expense / max) * 100}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-[#c4c7c8]">{month.month.slice(5)}</span>
          </div>
        ))}
      </div>
      ) : (
        <EmptyState
          actionHref="/finance#bank-statement-import"
          actionLabel="Import bank PDF"
          description="Income and expense trends will appear after your first import."
          icon="€"
          title="No cashflow trend yet"
        />
      )}
      <div className="mt-4 flex gap-4 text-[11px] font-semibold text-[#c4c7c8]"><ChartLegend color="#a3e635" label="Income" /><ChartLegend color="#60a5fa" label="Expense" /></div>
      {monthlyCashflow.length > 0 ? (
        <details className="mt-4 border-t border-white/10 pt-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-[#a3e635]">
            Accessible cashflow summary
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-[#aeb2b4]"><tr><th className="pb-2">Month</th><th>Income</th><th>Expense</th></tr></thead>
              <tbody>{monthlyCashflow.map((month) => <tr className="border-t border-white/[0.06]" key={month.month}><td className="py-2 text-white">{month.month}</td><td>{formatCurrency(month.income)}</td><td>{formatCurrency(month.expense)}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function AnalyticsCards({
  enabledDomains,
  filter,
  monthlyCashflow,
  productivity,
  rangeDays,
  today,
}: {
  enabledDomains: ProductivityDomain[];
  filter: TaskFilter;
  monthlyCashflow: Array<{ expense: number; income: number; month: string }>;
  productivity: ReturnType<typeof rescoreProductivity>;
  rangeDays: 7 | 30;
  today: string;
}) {
  return (
    <section className="grid gap-4 sm:col-span-2 sm:grid-cols-2 xl:col-span-12 xl:gap-5">
      <CashflowChart monthlyCashflow={monthlyCashflow} />
      <ProductivityChart
        current={productivity.current}
        enabledDomains={enabledDomains}
        filter={filter}
        previous={productivity.previous}
        rangeDays={rangeDays}
        today={today}
      />
    </section>
  );
}

function ProductivityChart({ current, enabledDomains, filter, previous, rangeDays, today }: { current: ProductivityPoint[]; enabledDomains: ProductivityDomain[]; filter: TaskFilter; previous: ProductivityPoint[]; rangeDays: 7 | 30; today: string }) {
  const chartX = (index: number) =>
    20 + (index / Math.max(1, current.length - 1)) * 560;
  const chartY = (score: number) => 112 - score;
  const previousPoints = previous.map((point, index) => `${chartX(index)},${chartY(point.score ?? 0)}`).join(" ");
  const currentPoints = current.flatMap((point, index) => point.score === null ? [] : [`${chartX(index)},${chartY(point.score)}`]).join(" ");
  const currentScores = current.flatMap((point) => point.score === null ? [] : [point.score]);
  const previousScores = previous.flatMap((point) => point.score === null ? [] : [point.score]);
  const currentAverage = currentScores.length ? Math.round(currentScores.reduce((sum, score) => sum + score, 0) / currentScores.length) : 0;
  const previousAverage = previousScores.length ? Math.round(previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length) : 0;
  const scoreChange = currentAverage - previousAverage;
  const hasActivity = current.some(
    (point) => point.plannedTasks > 0 || point.plannedFitness > 0 || point.focusMinutes > 0,
  );
  return (
    <article className="content-panel overview-card-enter overview-delay-6 rounded-[var(--radius-panel)] p-4 sm:p-5">
      <div><p className="label-caps text-[#ff4fa3]">Productivity</p><h2 className="mt-2 text-[22px] font-semibold text-white">Reliable {rangeDays}-day score</h2></div>
      <p className="mt-3 text-[12px] font-semibold text-[var(--text-secondary)]">
        {hasActivity
          ? `Productivity is ${scoreChange >= 0 ? `${scoreChange} points above` : `${Math.abs(scoreChange)} points below`} the previous ${rangeDays} days.`
          : "Complete a few tasks or training days to unlock a meaningful comparison."}
      </p>
      <p className="mt-3 text-[11px] leading-5 text-[#8d9092]">60% planned task completion · 25% planned training · 15% focus target (120 min). Enabled domains are normalized to 100%; future days stay empty.</p>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Productivity score domains">
        {(["tasks", "fitness", "focus"] as const).map((domain) => {
          const enabled = enabledDomains.includes(domain);
          const nextDomains = enabled
            ? enabledDomains.filter((item) => item !== domain)
            : [...enabledDomains, domain];
          return (
            <Link
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${enabled ? "bg-white text-[#202020]" : "border border-white/10 text-[#8d9092]"}`}
              href={`/?tasks=${filter}&domains=${nextDomains.length ? nextDomains.join(",") : "none"}`}
              key={domain}
            >
              {enabled ? "✓ " : ""}{domain}
              <LinkPendingIndicator label={`Updating ${domain}`} />
            </Link>
          );
        })}
      </div>
      <div className="relative mt-3 h-44" role="img" aria-label={`Current and previous ${rangeDays}-day productivity scores`}>
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 600 130">
          {[12, 62, 112].map((y) => <line key={y} stroke="rgba(255,255,255,0.07)" x1="20" x2="580" y1={y} y2={y} />)}
          <polyline fill="none" points={previousPoints} stroke="rgba(196,199,200,0.28)" strokeDasharray="7 7" strokeWidth="3" />
          <polyline className="overview-line-draw" fill="none" pathLength="1" points={currentPoints} stroke="#ff4fa3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {current.map((point, index) => point.score === null ? null : (
            <circle cx={chartX(index)} cy={chartY(point.score)} fill={point.date === today ? "#a3e635" : "#ff4fa3"} key={point.date} r={point.date === today ? 7 : 5}>
              <title>{`${point.label}: ${point.score}% — ${point.completedTasks}/${point.plannedTasks} tasks, ${point.completedFitness}/${point.plannedFitness} training, ${point.focusMinutes} focus min`}</title>
            </circle>
          ))}
        </svg>
        {current.map((point, index) => point.score === null ? null : (
          <span
            aria-label={`${point.label}: ${point.score}% productivity, ${point.completedTasks} of ${point.plannedTasks} tasks, ${point.completedFitness} of ${point.plannedFitness} training, ${point.focusMinutes} focus minutes`}
            className="group absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none"
            key={`${point.date}-focus-target`}
            role="img"
            style={{ left: `${(chartX(index) / 600) * 100}%`, top: `${(chartY(point.score) / 130) * 100}%` }}
            tabIndex={0}
            title={`${point.label}: ${point.score}%`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-transparent ring-0 group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent-primary)] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[var(--surface-1)]" />
          </span>
        ))}
        <div
          className="absolute inset-x-0 bottom-0 grid text-center text-[10px] font-semibold text-[#c4c7c8]"
          style={{ gridTemplateColumns: `repeat(${current.length}, minmax(0, 1fr))` }}
        >
          {current.map((point, index) => (
            <span className={point.date === today ? "text-[#a3e635]" : ""} key={point.date}>
              {rangeDays === 7 || index % 5 === 0 || index === current.length - 1
                ? rangeDays === 7 ? point.label : point.date.slice(5)
                : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-[11px] font-semibold text-[#c4c7c8]"><ChartLegend color="#ff4fa3" label={`Last ${rangeDays} days`} /><ChartLegend color="rgba(196,199,200,0.45)" label={`Previous ${rangeDays} days`} /></div>
      <details className="mt-4 border-t border-white/10 pt-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-[#a3e635]">Accessible score summary</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="text-[#8d9092]"><tr><th className="pb-2">Day</th><th>Score</th><th>Tasks</th><th>Training</th><th>Focus</th></tr></thead><tbody>{current.map((point) => <tr className="border-t border-white/[0.06]" key={point.date}><td className="py-2 text-white">{point.label}</td><td>{point.score === null ? "—" : `${point.score}%`}</td><td>{point.future ? "—" : `${point.completedTasks}/${point.plannedTasks}`}</td><td>{point.future ? "—" : `${point.completedFitness}/${point.plannedFitness}`}</td><td>{point.future ? "—" : `${point.focusMinutes} min`}</td></tr>)}</tbody></table></div>
      </details>
    </article>
  );
}

function getEnabledDomains(value: string | undefined): ProductivityDomain[] {
  if (value === "none") return [];
  if (!value) return ["tasks", "fitness", "focus"];
  const valid: ProductivityDomain[] = ["tasks", "fitness", "focus"];
  return valid.filter((domain) => value.split(",").includes(domain));
}

function WeeklyReviewCard({ reflection, review }: { reflection: WeeklyReflection; review: WeeklyReview }) {
  const scoreChange = review.score - review.previousScore;
  return (
    <article className="content-panel overview-card-enter overview-delay-7 scroll-mt-6 rounded-[var(--radius-panel)] p-5 sm:col-span-2 xl:col-span-12 xl:p-6" id="weekly-review">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="label-caps text-[#a78bfa]">Weekly review</p><h2 className="editorial-display mt-2 text-[32px] leading-tight text-white">Close the loop</h2></div>
        <p className={`text-[13px] font-semibold ${scoreChange >= 0 ? "text-[#a3e635]" : "text-[#ff9f9f]"}`}>{scoreChange >= 0 ? "+" : ""}{scoreChange} points vs last week</p>
      </div>
      <dl className="mt-5 grid overflow-hidden border-y border-[var(--border-subtle)] sm:grid-cols-2 xl:grid-cols-5">
        <ReviewMetric label="Tasks" value={`${review.completedTasks}/${review.plannedTasks}`} detail={`${review.overdueCarried} overdue carried`} />
        <ReviewMetric label="Training" value={`${review.sessions} sessions`} detail={`${review.sessionMinutes} total minutes`} />
        <ReviewMetric label="Income" value={formatCurrency(review.income)} detail="Paid this week" />
        <ReviewMetric label="Expenses" value={formatCurrency(review.expenses)} detail="Paid this week" />
        <ReviewMetric label="Savings rate" value={`${review.savingsRate}%`} detail={`${review.score}% weekly score`} />
      </dl>
      <form action={saveWeeklyReflectionAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="grid gap-2"><span className="label-caps text-[#c4c7c8]">What worked?</span><textarea className="field-input min-h-20 py-3" defaultValue={reflection.whatWorked} name="whatWorked" placeholder="One thing worth repeating…" /></label>
        <label className="grid gap-2"><span className="label-caps text-[#c4c7c8]">What changes next week?</span><textarea className="field-input min-h-20 py-3" defaultValue={reflection.changeNextWeek} name="changeNextWeek" placeholder="One deliberate adjustment…" /></label>
        <PendingSubmitButton
          className="h-11 rounded-[12px] bg-white px-5 text-[13px] font-bold text-[#202020]"
          pendingLabel="Saving…"
        >
          Save review
        </PendingSubmitButton>
      </form>
    </article>
  );
}

function ReviewMetric({ detail, label, value }: { detail: string; label: string; value: string }) { return <div className="border-b border-[var(--border-subtle)] p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0"><dt className="label-caps text-[#8d9092]">{label}</dt><dd className="metric-value mt-2 text-[20px] font-semibold text-white">{value}</dd><p className="mt-1 text-[11px] text-[#8d9092]">{detail}</p></div>; }
function ChartLegend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>; }

function RingLegend({ color, href, label, value }: { color: string; href: string; label: string; value: string }) { return <Link className="overview-interactive-card flex min-h-11 items-center justify-between rounded-[var(--radius-row)] border border-[var(--border-subtle)] bg-white/[0.025] p-3 transition hover:bg-white/[0.05]" href={href}><span className="inline-flex items-center gap-2 text-[13px] font-semibold text-white"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</span><span className="text-[13px] font-semibold text-[var(--text-secondary)]">{value}</span><LinkPendingIndicator label={`Opening ${label}`} /></Link>; }
function MiniPill({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] border border-white/10 bg-[#201f1f]/60 p-3"><p className="label-caps text-[#8d9092]">{label}</p><p className="metric-value mt-2 text-[15px] font-semibold text-white">{value}</p></div>; }
