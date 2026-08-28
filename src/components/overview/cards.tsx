import Link from "next/link";
import type { ReactNode } from "react";
import { DayAscent } from "@/components/DayAscent";
import { DayCardShare } from "@/components/DayCardShare";
import { RecapShare } from "@/components/RecapShare";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";
import { MomentumOrbit } from "@/components/MomentumOrbit";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { WeeklyReflectionForm } from "@/components/WeeklyReflectionForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SystemDot, TintPanel } from "@/components/ui/tint-panel";
import { CountUp } from "@/components/CountUp";
import { Pip } from "@/components/brand/Pip";
import { ClimbCurve } from "@/components/ClimbCurve";
import type { PanelPip } from "@/lib/mascot";
import { PIP_KITS, getClimb, getPanelPip, getPipState } from "@/lib/mascot";
import { getRingsSummary } from "@/lib/activity-rings";
import { getAscent } from "@/lib/ascent";
import { getClosingLines } from "@/lib/progression";
import type { getEarnedToday } from "@/lib/progression";
import type { Milestone, SetupState } from "@/lib/progression";
import type {
  WeeklyReflection,
  WeeklyReview,
  getDailyRings,
} from "@/lib/dashboard";
import { getTrainingGuidance } from "@/lib/training-guidance";
import type {
  GhostRace,
  Momentum,
  MomentumRecords,
  StreakState,
  getDayCard,
} from "@/lib/momentum";
import type { WeekRecap } from "@/lib/recap";
import type { OverviewQueryState } from "@/lib/overview-query";
import { getOverviewHref } from "@/lib/overview-query";
import type {
  ProductivityDomain,
  ProductivityPoint,
} from "@/lib/productivity-score";
import { getProductivityChartPaths } from "@/lib/productivity-score";
import type { Task } from "@/lib/tasks";
import { formatRelativeTaskDate, getTaskStats, isRepeating } from "@/lib/tasks";
import { describeRepeat } from "@/lib/routines";
import { formatReward } from "@/lib/reward";
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
  pip,
  seed = 0,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  /** The card's own Pip, derived from the card's own two numbers. */
  pip?: PanelPip;
  seed?: number;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      {pip ? (
        <Pip
          burn={pip.burn}
          kit={pip.kit}
          className="-mt-1 shrink-0"
          mood={pip.mood}
          seed={seed}
          size={34}
          title={pip.title}
        />
      ) : null}
      <div className="min-w-0 flex-1">
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
  todayScore,
}: {
  dailyRings: ReturnType<typeof getDailyRings>;
  earned: ReturnType<typeof getEarnedToday>;
  todayScore: number | null;
}) {
  const summary = getRingsSummary(
    Object.values(dailyRings)
      .filter((area) => area.total > 0)
      .map((area) => area.percent),
  );
  const ascent = getAscent({
    areas: [
      { ...dailyRings.tasks, label: "Tasks", system: "tasks" as const },
      { ...dailyRings.fitness, label: "Fitness", system: "fitness" as const },
      { ...dailyRings.habits, label: "Habits", system: "habits" as const },
    ],
    todayScore: todayScore ?? null,
  });
  const headline = summary.total === 0
    ? "Nothing is planned yet today."
    : summary.allClosed
      ? "Every stage is done."
      : `${summary.closed} of ${summary.total} stages done.`;
  const closing = getClosingLines(dailyRings)[0] ?? null;

  return (
    <TintPanel
      className="settle-in settle-1 flex flex-col gap-6 lg:col-span-2"
      id="today-rings"
      system={earned.allClosed ? "fitness" : "neutral"}
    >
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

        <DayAscent ascent={ascent} />
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
  momentum,
  streak,
}: {
  dayCard: ReturnType<typeof getDayCard>;
  momentum: Momentum;
  streak: StreakState;
}) {
  const holdLine =
    momentum.holdScore === null
      ? `${momentum.tier.name} cannot be held in a single day. Start the climb back today.`
      : momentum.holdScore === 0
        ? `${momentum.tier.name} holds even on an empty day.`
        : `Finish today at ${momentum.holdScore}% to stay in ${momentum.tier.name}.`;
  // Yesterday's altitude against today's: the multiplier is the real one.
  const yesterday =
    momentum.series[momentum.series.length - 2]?.altitude ?? momentum.altitude;
  const climb = getClimb(yesterday, momentum.projected);

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

      {/* The climb is capped rather than stretched: across a full desktop card
          the curve flattens into a straight line and stops being a climb. */}
      <div className="grid gap-6 sm:grid-cols-[minmax(0,160px)_minmax(0,560px)] sm:items-center">
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
          <div className="rounded-xl bg-card/70 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="label-caps text-[var(--ink,var(--muted-foreground))]">
                Today&rsquo;s climb
              </p>
              <p className="text-[12px] text-muted-foreground">
                {climb.rising
                  ? "What today did to the orbit."
                  : "An empty day multiplies by 0.85."}
              </p>
            </div>
            <ClimbCurve climb={climb} />
          </div>

        </div>
      </div>

      <DayCardShare
        altitude={dayCard.altitude}
        date={dayCard.date}
        ghost={dayCard.ghost}
        metrics={dayCard.metrics}
        mood={
          getPipState({
            allClosed: false,
            altitude: momentum.projected,
            streak: streak.streak,
            todayScore: momentum.todayScore,
          }).mood
        }
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
  doneToday,
  pinnedCategory,
  quickTasks,
  rewards,
  taskStats,
  today,
  timeZone,
  total,
}: {
  /** Routines already ticked for today; a routine is never done for good. */
  doneToday: string[];
  pinnedCategory: string;
  quickTasks: Task[];
  /** What each task is worth today, in the voyage's own kilometres. */
  rewards: Record<string, number>;
  taskStats: ReturnType<typeof getTaskStats>;
  today: string;
  timeZone: string;
  total: number;
}) {
  return (
    <TintPanel className="settle-in settle-3 flex flex-col gap-5" system="tasks">
      <CardHeading
        eyebrow={pinnedCategory ? `Tasks · ${pinnedCategory}` : "Tasks"}
        pip={getPanelPip(
          taskStats.completedTasksCount,
          taskStats.completedTasksCount + taskStats.activeTasksCount,
          "tasks",
          PIP_KITS.tasks,
        )}
        seed={6}
        title={
          total === 0
            ? "The queue is clear."
            : `${taskStats.activeTasksCount} open of ${total}.`
        }
      />

      {quickTasks.length === 0 ? (
        <p className="rounded-xl bg-card/70 p-4 text-[13px]">
          Nothing in this view. Plan only what deserves a day.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {quickTasks.map((task) => {
            const routine = isRepeating(task);
            const done = routine ? doneToday.includes(task.id) : task.completed;
            const reward = done ? 0 : rewards[task.id] ?? 0;
            return (
              <li key={task.id}>
                <form action={toggleTaskAction}>
                  <input name="id" type="hidden" value={task.id} />
                  <input
                    name="completed"
                    type="hidden"
                    value={done ? "false" : "true"}
                  />
                  <input name="date" type="hidden" value={today} />
                  <input name="redirectTo" type="hidden" value="/" />
                  <button
                    className="press-row flex w-full items-center gap-3 rounded-xl bg-card/70 p-3 text-left hover:bg-card"
                    type="submit"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${
                        done ? "border-tasks bg-tasks text-white" : "border-tasks/35"
                      }`}
                    >
                      {done ? <CheckGlyph /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[14px] font-semibold ${
                          done ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">
                        {routine
                          ? describeRepeat(task.repeatDays)
                          : formatRelativeTaskDate(task, today, timeZone)}
                        {" · "}
                        {task.category}
                      </span>
                    </span>
                    {reward > 0 ? (
                      <span className="metric-value shrink-0 text-[12px] font-bold text-tasks-ink">
                        {formatReward(reward)}
                      </span>
                    ) : null}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {/* Adding was a floating button and a line in another card. It is the
          most common thing anyone does here, so it says so. */}
      <div className="flex flex-wrap gap-2">
        <Button asChild className="flex-1">
          <Link href="/tasks#new-task">
            New task
            <LinkPendingIndicator label="Opening the task form" />
          </Link>
        </Button>
        <Button asChild className="flex-1" variant="outline">
          <Link href="/tasks">
            All tasks
            <LinkPendingIndicator label="Opening tasks" />
          </Link>
        </Button>
      </div>
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
  const guidance = getTrainingGuidance(training.day.sport, training.title);

  return (
    <TintPanel className="settle-in settle-3 flex flex-col gap-5" system="fitness">
      <CardHeading
        action={
          <Badge variant="fitness">
            {resting ? "Rest" : done ? "Complete" : "Planned"}
          </Badge>
        }
        eyebrow={
          resting
            ? "Fitness today"
            : `Fitness today · ${training.day.plannedDurationMinutes} min`
        }
        pip={getPanelPip(
          done ? 1 : 0,
          resting ? 0 : 1,
          "training",
          training.day.sport === "tennis" ? PIP_KITS.tennis : PIP_KITS.fitness,
        )}
        seed={7}
        title={resting ? "Recovery day." : training.title}
      />

      {resting ? (
        <p className="text-[13px] text-muted-foreground">
          No session is planned. Recovery is part of the plan, not a gap in it.
        </p>
      ) : (
        // What the session is, not only that there is one. The minutes and the
        // focus used to be two tiles above this; they are four words, and the
        // heading had room for them.
        <div className="rounded-xl bg-card/70 p-3">
          <p className="text-[13px] leading-5">{guidance.main}</p>
          <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">
            Warm up: {guidance.warmup}
          </p>
        </div>
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

      <Link
        className="press-row -mx-2 rounded-xl px-2 py-1 text-center text-[13px] font-semibold text-fitness-ink"
        href="/fitness"
      >
        Open fitness
        <LinkPendingIndicator label="Opening fitness" />
      </Link>
    </TintPanel>
  );
}

export function AnalyticsCard({
  enabledDomains,
  ghost,
  overviewQuery,
  productivity,
  rangeDays,
  records,
  review,
  streak,
  today,
  weekChange,
}: {
  ghost: GhostRace;
  records: MomentumRecords;
  streak: StreakState;
  weekChange: number;
  enabledDomains: ProductivityDomain[];
  overviewQuery: OverviewQueryState;
  productivity: { current: ProductivityPoint[]; previous: ProductivityPoint[] };
  rangeDays: 7 | 30;
  review: WeeklyReview;
  today: string;
}) {
  const points = productivity.current;
  const ghostTotal = Math.max(ghost.current, ghost.previous, 1);
  const width = 640;
  const height = 200;
  const chartX = (index: number) =>
    points.length > 1 ? (index / (points.length - 1)) * width : width / 2;
  const chartY = (score: number) => height - (score / 100) * (height - 24) - 12;
  const paths = getProductivityChartPaths(points, chartX, chartY);
  const domainToggles: Array<{ id: ProductivityDomain; label: string }> = [
    { id: "tasks", label: "Tasks" },
    { id: "fitness", label: "Fitness" },
    { id: "habits", label: "Habits" },
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

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Days in orbit" value={`${streak.streak}`} />
            <Figure label="Best run" value={`${streak.bestStreak}`} />
            <Figure label="Peak" value={`${records.bestAltitude}`} />
            <Figure
              label="7-day"
              value={`${weekChange >= 0 ? "+" : ""}${weekChange}`}
            />
      </dl>

          <div className="rounded-xl bg-muted p-4">
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

      <div className="grid gap-3 sm:grid-cols-4">
        <ReviewFigure
          detail={`${review.sessionMinutes} min`}
          href="/fitness"
          label="Sessions"
          value={`${review.sessions}`}
        />
        <ReviewFigure
          detail="overdue tasks"
          href="/tasks?date=overdue"
          label="Carried"
          value={`${review.overdueCarried}`}
        />
        <ReviewFigure
          detail="of income"
          href="/finance"
          label="Savings"
          value={`${review.savingsRate}%`}
        />
        <ReviewFigure
          detail="weekly average"
          href="#trends-title"
          label="Score"
          value={`${review.score}%`}
        />
      </div>

      <Progress
        aria-label={`Weekly score ${review.score} percent`}
        value={review.score}
      />

      <WeeklyReflectionForm reflection={reflection} />
    </TintPanel>
  );
}

/**
 * A figure from the week. Each one is somewhere you can go: a tile this size
 * with a number this big is read as a control, so it leads to the page the
 * number came from.
 */
export function ReviewFigure({
  detail,
  href,
  label,
  value,
}: {
  detail: string;
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      className="press-row rounded-xl bg-muted p-4 hover:bg-secondary"
      href={href}
    >
      <span className="label-caps block text-muted-foreground">{label}</span>
      <span className="metric-value mt-2 block text-[22px] font-bold">
        {value}
      </span>
      <span className="mt-0.5 block text-[12px] text-muted-foreground">
        {detail}
      </span>
    </Link>
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
        <div className="flex min-w-0 items-start gap-3">
          <Pip burn={0.3} className="-mt-1 shrink-0" mood="grounded" seed={11} size={40} />
          <div className="min-w-0">
          <p className="label-caps text-[var(--ink)]">Set up your Orbit</p>
          <p className="mt-2 text-[20px] font-bold tracking-[-0.02em]">
            {setup.next.label}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {setup.next.detail}
          </p>
          </div>
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
        pip={getPanelPip(earned.length, milestones.length, "milestones")}
        seed={9}
        title={
          earned.length === 0
            ? "Nothing earned yet — the first one is close."
            : `${earned.length} earned.`
        }
      />

      <ul className="grid gap-2 sm:grid-cols-2">
        {[...earned, ...next].map((item, index) => (
          <li
            className={`rise-in flex items-center gap-3 rounded-xl p-3 ${
              item.achieved ? "bg-fitness-tint" : "bg-muted"
            }`}
            key={item.id}
            style={{ "--rise-index": index } as React.CSSProperties}
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

export function RecapCard({ recap }: { recap: WeekRecap }) {
  return (
    <TintPanel className="flex flex-col gap-5" system="plum">
      <CardHeading
        action={
          recap.isBestWeek ? (
            <Badge className="bg-plum text-white" variant="plum">
              Best week yet
            </Badge>
          ) : (
            <Badge className="bg-card" variant="muted">
              {recap.label}
            </Badge>
          )
        }
        eyebrow="Last week"
        pip={getPanelPip(recap.days.filter((day) => day.inOrbit).length, recap.days.length, "last week")}
        seed={10}
        title={recap.headline}
      />

      <p className="-mt-2 text-[13px] text-muted-foreground">{recap.verdict}</p>

      <RecapWeekBars days={recap.days} />

      <dl className="grid grid-cols-3 gap-2">
        {recap.stats.map((stat) => (
          <div className="rounded-xl bg-card p-3" key={stat.label}>
            <dt className="label-caps text-muted-foreground">{stat.label}</dt>
            <dd className="metric-value mt-1 text-[20px] font-bold">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {recap.tier.name} ·{" "}
          <span className="font-semibold text-foreground">
            {recap.altitudeChange >= 0 ? "+" : "−"}
            {Math.abs(recap.altitudeChange)}
          </span>{" "}
          altitude across the week
        </p>
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
      </div>
    </TintPanel>
  );
}

/** The seven days of the finished week, lit where the day held orbit. */
export function RecapWeekBars({ days }: { days: WeekRecap["days"] }) {
  return (
    <ol className="flex items-end gap-1.5 sm:gap-2" aria-label="Last week by day">
      {days.map((day) => (
        <li className="flex min-w-0 flex-1 flex-col items-center gap-2" key={day.date}>
          <div className="flex h-28 w-full max-w-[46px] items-end rounded-full bg-card">
            <div
              className={`w-full rounded-full ${
                day.inOrbit ? "bg-plum" : "bg-muted-foreground/25"
              }`}
              style={{ height: `${Math.max(6, Math.min(100, day.score))}%` }}
              title={`${day.label}: ${day.score}%`}
            />
          </div>
          <span
            className={`label-caps ${
              day.inOrbit ? "text-plum-ink" : "text-muted-foreground"
            }`}
          >
            {day.label.slice(0, 2)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Pip, next to the greeting: the state of the day as a face, before a single
 * number is read. The heading stays with the page; Pip only brings the mood.
 */
export function PipGreeting({
  allClosed,
  altitude,
  children,
  streak,
  todayScore,
}: {
  allClosed: boolean;
  altitude: number;
  /** The page heading, so the route keeps owning its h1. */
  children: ReactNode;
  streak: number;
  todayScore: number | null;
}) {
  const pip = getPipState({ allClosed, altitude, streak, todayScore });

  return (
    <div className="flex items-center gap-4">
      <Pip
        burn={pip.burn}
        className="shrink-0"
        mood={pip.mood}
        seed={1}
        size={64}
        title={`Pip: ${pip.line}`}
      />
      <div className="min-w-0">
        {children}
        <p className="mt-1 text-[14px] text-muted-foreground">{pip.line}</p>
      </div>
    </div>
  );
}
