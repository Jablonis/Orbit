import Link from "next/link";
import type { ReactNode } from "react";
import { ActivityRings } from "@/components/ActivityRings";
import { DayCardShare } from "@/components/DayCardShare";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";
import { MomentumOrbit } from "@/components/MomentumOrbit";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { WeeklyReflectionForm } from "@/components/WeeklyReflectionForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SystemDot, TintPanel } from "@/components/ui/tint-panel";
import { CountUp } from "@/components/CountUp";
import { getRingsSummary } from "@/lib/activity-rings";
import { getClosingLines } from "@/lib/progression";
import type { getEarnedToday } from "@/lib/progression";
import type { Milestone, SetupState } from "@/lib/progression";
import type {
  WeeklyReflection,
  WeeklyReview,
  getDailyRings,
} from "@/lib/dashboard";
import { formatCurrency, getFinanceSummary } from "@/lib/finance";
import { getPinnedFinanceMetric } from "@/lib/finance-metric";
import type {
  GhostRace,
  Momentum,
  MomentumRecords,
  StreakState,
  getDayCard,
} from "@/lib/momentum";
import type {
  OverviewQueryState,
  OverviewTaskFilter,
} from "@/lib/overview-query";
import { getOverviewHref } from "@/lib/overview-query";
import type {
  ProductivityDomain,
  ProductivityPoint,
} from "@/lib/productivity-score";
import { getProductivityChartPaths } from "@/lib/productivity-score";
import type { Task } from "@/lib/tasks";
import { formatRelativeTaskDate, getTaskStats } from "@/lib/tasks";
import { toggleFitnessDoneFormAction } from "@/app/fitness/actions";
import { toggleTaskAction } from "@/app/tasks/actions";

export function greeting(locale: string, timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(new Date()),
  );
  void locale;
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

export function CardHeading({
  action,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="label-caps text-[var(--ink,var(--muted-foreground))]">{eyebrow}</p>
        <p className="mt-2 text-[17px] font-bold leading-6 tracking-[-0.02em]">
          {title}
        </p>
      </div>
      {action}
    </div>
  );
}

export function RingsCard({
  dailyRings,
  earned,
  nextTask,
  today,
  timeZone,
  training,
}: {
  dailyRings: ReturnType<typeof getDailyRings>;
  earned: ReturnType<typeof getEarnedToday>;
  nextTask?: Task;
  today: string;
  timeZone: string;
  training: import("@/lib/fitness").TodayTraining;
}) {
  const summary = getRingsSummary(
    Object.values(dailyRings)
      .filter((area) => area.total > 0)
      .map((area) => area.percent),
  );
  const headline = summary.total === 0
    ? "Nothing is planned yet today."
    : summary.allClosed
      ? "All rings closed."
      : `${summary.closed} of ${summary.total} rings closed.`;
  const closing = getClosingLines(dailyRings)[0] ?? null;
  const action = nextTask
    ? { href: "/tasks", label: "Open next task" }
    : training.day.sport !== "rest" && !training.day.log.completed
      ? { href: "/fitness#training-calendar", label: "Log the session" }
      : { href: "/tasks#new-task", label: "Plan the next move" };

  return (
    <TintPanel
      className="settle-in settle-1 flex flex-col gap-6 lg:col-span-2"
      system={earned.allClosed ? "fitness" : "neutral"}
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center">
        <div className="mx-auto w-full max-w-[180px]">
          <ActivityRings
            finance={dailyRings.finance.percent}
            fitness={dailyRings.fitness.percent}
            tasks={dailyRings.tasks.percent}
          />
        </div>
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="label-caps text-[var(--ink,var(--muted-foreground))]">
                Today
              </p>
              {earned.headline ? (
                <Badge variant={earned.allClosed ? "fitness" : "muted"}>
                  {earned.headline}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-[26px] font-bold leading-8 tracking-[-0.03em]">
              {headline}
            </p>
            {closing ? (
              <p className="mt-1.5 text-[14px] font-semibold text-[var(--ink,var(--muted-foreground))]">
                {closing.text}
              </p>
            ) : null}
          </div>
          <dl className="flex flex-wrap gap-2">
            <RingChip
              label="Tasks"
              system="tasks"
              value={dailyRings.tasks.total
                ? `${dailyRings.tasks.completed}/${dailyRings.tasks.total}`
                : "None due"}
            />
            <RingChip
              label="Fitness"
              system="fitness"
              value={dailyRings.fitness.total
                ? `${dailyRings.fitness.completed}/${dailyRings.fitness.total}`
                : "Rest day"}
            />
            <RingChip
              label="Finance"
              system="finance"
              value={dailyRings.finance.total
                ? `${dailyRings.finance.completed}/${dailyRings.finance.total}`
                : "Nothing due"}
            />
          </dl>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="label-caps text-muted-foreground">Next clear move</p>
          <p className="mt-1.5 truncate text-[16px] font-semibold">
            {nextTask?.title ??
              (training.day.sport !== "rest"
                ? training.title
                : "Your schedule is clear")}
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {nextTask
              ? `${nextTask.category} · ${formatRelativeTaskDate(nextTask, today, timeZone)}`
              : training.day.sport !== "rest"
                ? `${training.day.plannedDurationMinutes} min planned · ${training.focus}`
                : "Add something only if it deserves your attention."}
          </p>
        </div>
        <Button asChild>
          <Link href={action.href}>
            {action.label}
            <LinkPendingIndicator label={`Opening ${action.label}`} />
          </Link>
        </Button>
      </div>
    </TintPanel>
  );
}

export function RingChip({
  label,
  system,
  value,
}: {
  label: string;
  system: "tasks" | "fitness" | "finance";
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-2">
      <SystemDot system={system} />
      <dt className="text-[13px] font-semibold">{label}</dt>
      <dd className="metric-value text-[13px] text-muted-foreground">{value}</dd>
    </div>
  );
}

export function MomentumCard({
  dayCard,
  ghost,
  momentum,
  records,
  streak,
}: {
  dayCard: ReturnType<typeof getDayCard>;
  ghost: GhostRace;
  momentum: Momentum;
  records: MomentumRecords;
  streak: StreakState;
}) {
  const holdLine =
    momentum.holdScore === null
      ? `${momentum.tier.name} cannot be held in a single day. Start the climb back today.`
      : momentum.holdScore === 0
        ? `${momentum.tier.name} holds even on an empty day.`
        : `Finish today at ${momentum.holdScore}% to stay in ${momentum.tier.name}.`;
  const ghostTotal = Math.max(ghost.current, ghost.previous, 1);

  return (
    <TintPanel
      className="settle-in settle-2 flex flex-col gap-5 lg:col-span-2"
      system="plum"
    >
      <CardHeading
        action={<Badge variant="plum">{momentum.tier.name}</Badge>}
        eyebrow="Momentum"
        title={holdLine}
      />

      <div className="grid gap-6 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-center">
        <div className="relative mx-auto w-full max-w-[160px]">
          <MomentumOrbit
            altitude={momentum.altitude}
            projected={momentum.projected}
            series={momentum.series}
            tier={momentum.tier}
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="metric-value display-figure text-[36px]">
                <CountUp value={momentum.projected} />
              </p>
              <p className="label-caps mt-1 text-[var(--ink,var(--muted-foreground))]">Altitude</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Days in orbit" value={`${streak.streak}`} />
            <Figure label="Best run" value={`${streak.bestStreak}`} />
            <Figure label="Peak" value={`${records.bestAltitude}`} />
            <Figure
              label="7-day"
              value={`${momentum.weekChange >= 0 ? "+" : ""}${momentum.weekChange}`}
            />
          </dl>

          <div className="rounded-xl bg-card/70 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="label-caps text-[var(--ink,var(--muted-foreground))]">Ghost of last week</p>
              <p className="text-[12px] text-muted-foreground">{ghost.verdict}</p>
            </div>
            <div className="mt-3 space-y-2">
              <GhostBar
                color="var(--plum)"
                label="This week"
                total={ghostTotal}
                value={ghost.current}
              />
              <GhostBar
                color="color-mix(in srgb, var(--plum) 28%, transparent)"
                label="Last week"
                total={ghostTotal}
                value={ghost.previous}
              />
            </div>
          </div>
        </div>
      </div>

      <DayCardShare
        altitude={dayCard.altitude}
        date={dayCard.date}
        ghost={dayCard.ghost}
        metrics={dayCard.metrics}
        tierColor={dayCard.tier.color}
        tierName={dayCard.tier.name}
        trace={momentum.series.slice(-14).map((point) => point.altitude)}
      />
    </TintPanel>
  );
}

export function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/70 p-3">
      <dt className="label-caps text-[var(--ink,var(--muted-foreground))]">{label}</dt>
      <dd className="metric-value mt-1.5 text-[20px] font-bold">{value}</dd>
    </div>
  );
}

export function GhostBar({
  color,
  label,
  total,
  value,
}: {
  color: string;
  label: string;
  total: number;
  value: number;
}) {
  const percent = Math.round((Math.max(0, value) / Math.max(1, total)) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-plum/12">
        <span
          className="block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ backgroundColor: color, width: `${percent}%` }}
        />
      </span>
      <span className="metric-value w-10 shrink-0 text-right text-[12px] font-semibold">
        {value}
      </span>
    </div>
  );
}

export function TasksCard({
  filter,
  overviewQuery,
  pinnedCategory,
  quickTasks,
  taskStats,
  today,
  timeZone,
  total,
}: {
  filter: OverviewTaskFilter;
  overviewQuery: OverviewQueryState;
  pinnedCategory: string;
  quickTasks: Task[];
  taskStats: ReturnType<typeof getTaskStats>;
  today: string;
  timeZone: string;
  total: number;
}) {
  const filters: Array<{ id: OverviewTaskFilter; label: string }> = [
    { id: "today", label: "Today" },
    { id: "overdue", label: "Overdue" },
    { id: "upcoming", label: "Upcoming" },
  ];

  return (
    <TintPanel className="settle-in settle-3 flex flex-col gap-5" system="tasks">
      <CardHeading
        action={
          <Badge variant="tasks">
            {taskStats.completedTasksCount}/
            {taskStats.completedTasksCount + taskStats.activeTasksCount}
          </Badge>
        }
        eyebrow={pinnedCategory ? `Tasks · ${pinnedCategory}` : "Tasks"}
        title={
          total === 0
            ? "The queue is clear."
            : `${taskStats.activeTasksCount} open of ${total}.`
        }
      />

      <nav aria-label="Task filter" className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            aria-current={filter === item.id ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[12px] font-semibold transition ${
              filter === item.id
                ? "bg-tasks text-white"
                : "bg-card/70 text-tasks-ink hover:bg-card"
            }`}
            href={getOverviewHref(overviewQuery, { tasks: item.id })}
            key={item.id}
            scroll={false}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {quickTasks.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-4 text-[13px]">
          Nothing in this view. Plan only what deserves a day.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {quickTasks.map((task) => (
            <li key={task.id}>
              <form action={toggleTaskAction}>
                <input name="taskId" type="hidden" value={task.id} />
                <input
                  name="completed"
                  type="hidden"
                  value={task.completed ? "false" : "true"}
                />
                <input name="redirectTo" type="hidden" value="/" />
                <button
                  className="flex w-full items-center gap-3 rounded-xl bg-card/70 p-3 text-left transition hover:bg-card"
                  type="submit"
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${
                      task.completed
                        ? "border-tasks bg-tasks text-white"
                        : "border-tasks/35"
                    }`}
                  >
                    {task.completed ? <CheckGlyph /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[14px] font-semibold ${
                        task.completed
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {task.category} ·{" "}
                      {formatRelativeTaskDate(task, today, timeZone)}
                    </span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Button asChild className="w-full" variant="outline">
        <Link href="/tasks">
          Open tasks
          <LinkPendingIndicator label="Opening tasks" />
        </Link>
      </Button>
    </TintPanel>
  );
}

export function CheckGlyph() {
  return (
    <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function FitnessCard({
  training,
}: {
  training: import("@/lib/fitness").TodayTraining;
}) {
  const resting = training.day.sport === "rest";
  const done = training.day.log.completed;

  return (
    <TintPanel className="settle-in settle-3 flex flex-col gap-5" system="fitness">
      <CardHeading
        action={
          <Badge variant="fitness">
            {resting ? "Rest" : done ? "Complete" : "Planned"}
          </Badge>
        }
        eyebrow="Fitness today"
        title={resting ? "Recovery day." : training.title}
      />

      {resting ? (
        <p className="text-[13px] text-muted-foreground">
          No session is planned. Recovery is part of the plan, not a gap in it.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card/70 p-3">
            <dt className="label-caps opacity-60">Planned</dt>
            <dd className="metric-value mt-1.5 text-[20px] font-bold">
              {training.day.plannedDurationMinutes} min
            </dd>
          </div>
          <div className="rounded-xl bg-card/70 p-3">
            <dt className="label-caps opacity-60">Focus</dt>
            <dd className="mt-1.5 truncate text-[15px] font-semibold">
              {training.focus}
            </dd>
          </div>
        </dl>
      )}

      {resting ? null : (
        <form action={toggleFitnessDoneFormAction}>
          <input name="date" type="hidden" value={training.day.date} />
          <input
            name="completed"
            type="hidden"
            value={done ? "false" : "true"}
          />
          <input name="redirectTo" type="hidden" value="/" />
          <PendingSubmitButton
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-fitness px-5 text-[13px] font-semibold text-white transition hover:bg-fitness/90"
            pendingLabel="Saving"
          >
            {done ? "Mark as not done" : "Mark session complete"}
          </PendingSubmitButton>
        </form>
      )}

      <Button asChild className="w-full" variant="outline">
        <Link href="/fitness">
          Open fitness
          <LinkPendingIndicator label="Opening fitness" />
        </Link>
      </Button>
    </TintPanel>
  );
}

export function FinanceCard({
  finance,
  pendingFinance,
  pinnedFinance,
}: {
  finance: ReturnType<typeof getFinanceSummary>;
  pendingFinance?: import("@/lib/finance").FinanceTransaction;
  pinnedFinance: ReturnType<typeof getPinnedFinanceMetric>;
}) {
  return (
    <TintPanel className="settle-in settle-4 flex flex-col gap-5" system="finance">
      <CardHeading
        action={<Badge variant="finance">This month</Badge>}
        eyebrow={pinnedFinance.label}
        title={formatCurrency(pinnedFinance.value)}
      />

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card/70 p-3">
          <dt className="label-caps opacity-60">Income</dt>
          <dd className="metric-value mt-1.5 text-[17px] font-bold">
            {formatCurrency(finance.income)}
          </dd>
        </div>
        <div className="rounded-xl bg-card/70 p-3">
          <dt className="label-caps opacity-60">Expenses</dt>
          <dd className="metric-value mt-1.5 text-[17px] font-bold">
            {formatCurrency(finance.expenses)}
          </dd>
        </div>
      </dl>

      <div className="rounded-xl bg-card/70 p-4">
        <p className="label-caps text-[var(--ink,var(--muted-foreground))]">Next to review</p>
        <p className="mt-1.5 truncate text-[15px] font-semibold">
          {pendingFinance?.title ?? "Nothing is waiting"}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {pendingFinance
            ? `${pendingFinance.date} · ${formatCurrency(pendingFinance.amount)}`
            : "Cashflow is up to date."}
        </p>
      </div>

      <Button asChild className="w-full" variant="outline">
        <Link href="/finance">
          Open finance
          <LinkPendingIndicator label="Opening finance" />
        </Link>
      </Button>
    </TintPanel>
  );
}

export function AnalyticsCard({
  enabledDomains,
  overviewQuery,
  productivity,
  rangeDays,
  review,
  today,
}: {
  enabledDomains: ProductivityDomain[];
  overviewQuery: OverviewQueryState;
  productivity: { current: ProductivityPoint[]; previous: ProductivityPoint[] };
  rangeDays: 7 | 30;
  review: WeeklyReview;
  today: string;
}) {
  const points = productivity.current;
  const width = 640;
  const height = 200;
  const chartX = (index: number) =>
    points.length > 1 ? (index / (points.length - 1)) * width : width / 2;
  const chartY = (score: number) => height - (score / 100) * (height - 24) - 12;
  const paths = getProductivityChartPaths(points, chartX, chartY);
  const domainToggles: Array<{ id: ProductivityDomain; label: string }> = [
    { id: "tasks", label: "Tasks" },
    { id: "fitness", label: "Fitness" },
    { id: "focus", label: "Focus" },
  ];

  return (
    <TintPanel className="flex flex-col gap-5" system="neutral">
      <CardHeading
        action={
          <div className="flex flex-wrap gap-1.5">
            {domainToggles.map((domain) => {
              const active = enabledDomains.includes(domain.id);
              const next = active
                ? enabledDomains.filter((item) => item !== domain.id)
                : [...enabledDomains, domain.id];
              return (
                <Link
                  aria-pressed={active}
                  className={`inline-flex min-h-9 items-center rounded-full px-3 text-[12px] font-semibold transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  href={getOverviewHref(overviewQuery, {
                    domains: next.length === 0 ? "none" : next.join(","),
                  })}
                  key={domain.id}
                  scroll={false}
                >
                  {domain.label}
                </Link>
              );
            })}
          </div>
        }
        eyebrow={`Productivity · ${rangeDays} days`}
        title={`This week averages ${review.score}%.`}
      />

      {enabledDomains.length === 0 ? (
        <p className="rounded-xl bg-muted p-4 text-[13px] text-muted-foreground">
          Scoring is paused. Enable a domain to restore the trend.
        </p>
      ) : (
        <figure className="flex flex-col gap-3">
          <svg
            aria-hidden="true"
            className="h-[200px] w-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${width} ${height}`}
          >
            {[0, 50, 100].map((score) => (
              <line
                key={score}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                x1={0}
                x2={width}
                y1={chartY(score)}
                y2={chartY(score)}
              />
            ))}
            {paths.map((path) => (
              <path
                d={path}
                fill="none"
                key={path}
                stroke="var(--primary)"
                strokeLinecap="round"
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <figcaption className="flex items-center justify-between">
            <span className="label-caps text-muted-foreground">
              {points[0]?.date ?? ""}
            </span>
            <span className="label-caps text-muted-foreground">{today}</span>
          </figcaption>
        </figure>
      )}
    </TintPanel>
  );
}

export function ReviewCard({
  reflection,
  review,
}: {
  reflection: WeeklyReflection;
  review: WeeklyReview;
}) {
  const change = review.score - review.previousScore;

  return (
    <TintPanel className="flex flex-col gap-5" id="weekly-review" system="neutral">
      <CardHeading
        action={
          <Badge variant={change >= 0 ? "fitness" : "destructive"}>
            {change >= 0 ? "+" : ""}
            {change} vs last week
          </Badge>
        }
        eyebrow="Weekly review"
        title={`${review.completedTasks} of ${review.plannedTasks} planned tasks done.`}
      />

      <dl className="grid gap-3 sm:grid-cols-4">
        <ReviewFigure
          label="Sessions"
          value={`${review.sessions}`}
          detail={`${review.sessionMinutes} min`}
        />
        <ReviewFigure
          label="Carried"
          value={`${review.overdueCarried}`}
          detail="overdue tasks"
        />
        <ReviewFigure
          label="Savings"
          value={`${review.savingsRate}%`}
          detail="of income"
        />
        <ReviewFigure
          label="Score"
          value={`${review.score}%`}
          detail="weekly average"
        />
      </dl>

      <Progress
        aria-label={`Weekly score ${review.score} percent`}
        value={review.score}
      />

      <WeeklyReflectionForm reflection={reflection} />
    </TintPanel>
  );
}

export function ReviewFigure({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric-value mt-2 text-[22px] font-bold">{value}</dd>
      <p className="mt-0.5 text-[12px] text-muted-foreground">{detail}</p>
    </div>
  );
}


/**
 * A week at a glance, borrowed from the day strips that calendar and journal
 * apps put above the fold: seven days, each one a ring filled by that day's
 * score, with today marked. It reuses the productivity points the dashboard
 * already computes.
 */
export function WeekStrip({
  points,
  today,
}: {
  points: ProductivityPoint[];
  today: string;
}) {
  return (
    <section aria-label="This week" className="settle-in">
      <ol className="flex items-stretch gap-1.5 sm:gap-2">
        {points.map((point) => {
          const isToday = point.date === today;
          const score = point.score ?? 0;
          const future = point.future || point.date > today;
          const circumference = 2 * Math.PI * 14;
          return (
            <li className="min-w-0 flex-1" key={point.date}>
              <div
                className={`flex flex-col items-center gap-2 rounded-2xl px-1 py-3 transition ${
                  isToday ? "bg-plum-tint" : "bg-card"
                }`}
              >
                <span
                  className={`label-caps ${
                    isToday ? "text-plum-ink" : "text-muted-foreground"
                  }`}
                >
                  {point.label.slice(0, 2)}
                </span>
                <span className="relative grid size-9 place-items-center">
                  <svg className="size-9 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      fill="none"
                      r="14"
                      stroke={future ? "var(--muted)" : "var(--secondary)"}
                      strokeWidth="4"
                    />
                    {future ? null : (
                      <circle
                        cx="18"
                        cy="18"
                        fill="none"
                        r="14"
                        stroke={isToday ? "var(--plum)" : "var(--fitness)"}
                        strokeDasharray={circumference}
                        strokeDashoffset={
                          circumference * (1 - Math.min(100, score) / 100)
                        }
                        strokeLinecap="round"
                        strokeWidth="4"
                      />
                    )}
                  </svg>
                  <span className="metric-value absolute text-[11px] font-semibold">
                    {future ? "" : score}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * The cold start. Shown only while an account still has something to set up,
 * so it disappears for good once Orbit is actually running.
 */
export function SetupCard({ setup }: { setup: SetupState }) {
  if (setup.complete || !setup.next) return null;

  return (
    <TintPanel className="settle-in flex flex-col gap-5" system="plum">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps text-[var(--ink)]">Set up your Orbit</p>
          <p className="mt-2 text-[20px] font-bold tracking-[-0.02em]">
            {setup.next.label}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {setup.next.detail}
          </p>
        </div>
        <Button asChild>
          <Link href={setup.next.href}>
            Do it now
            <LinkPendingIndicator label={setup.next.label} />
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="label-caps text-[var(--ink)]">
            {setup.done} of {setup.steps.length} done
          </span>
          <span className="metric-value text-[13px] font-semibold">
            {setup.percent}%
          </span>
        </div>
        <Progress
          aria-label={`Setup ${setup.percent} percent complete`}
          indicatorClassName="bg-plum"
          value={setup.percent}
        />
        <ol className="grid gap-2 sm:grid-cols-2">
          {setup.steps.map((step) => (
            <li
              className="flex items-center gap-2.5 rounded-xl bg-card/70 p-3"
              key={step.id}
            >
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full ${
                  step.done
                    ? "bg-plum text-white"
                    : "border-2 border-plum/30"
                }`}
              >
                {step.done ? <CheckGlyph /> : null}
              </span>
              <span
                className={`text-[13px] font-semibold ${
                  step.done ? "text-muted-foreground line-through" : ""
                }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </TintPanel>
  );
}

/**
 * What the account has earned, and the one thing it is closest to earning.
 * Records are the part of a habit app people actually revisit.
 */
export function MilestonesCard({ milestones }: { milestones: Milestone[] }) {
  const earned = milestones.filter((item) => item.achieved);
  const next = milestones.filter((item) => !item.achieved);

  return (
    <TintPanel className="flex flex-col gap-5" system="neutral">
      <CardHeading
        action={
          <Badge variant="fitness">
            {earned.length}/{milestones.length}
          </Badge>
        }
        eyebrow="Milestones"
        title={
          earned.length === 0
            ? "Nothing earned yet — the first one is close."
            : `${earned.length} earned.`
        }
      />

      <ul className="grid gap-2 sm:grid-cols-2">
        {[...earned, ...next].map((item) => (
          <li
            className={`flex items-center gap-3 rounded-xl p-3 ${
              item.achieved ? "bg-fitness-tint" : "bg-muted"
            }`}
            key={item.id}
          >
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-full ${
                item.achieved
                  ? "bg-fitness text-white"
                  : "bg-card text-muted-foreground"
              }`}
            >
              {item.achieved ? (
                <CheckGlyph />
              ) : (
                <span className="metric-value text-[11px] font-semibold">
                  {Math.round(item.progress * 100)}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">
                {item.label}
              </span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {item.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </TintPanel>
  );
}
