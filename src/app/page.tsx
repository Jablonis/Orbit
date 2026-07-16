import Link from "next/link";
import { AppNavigation } from "@/components/AppNavigation";
import { QuickAdd } from "@/components/QuickAdd";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type ProductivityPoint,
  type ProductivityDomain,
  type WeeklyReflection,
  type WeeklyReview,
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
  type Task,
  formatRelativeTaskDate,
  getDateInTimeZone,
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
  searchParams: Promise<{ domains?: string; tasks?: string }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const params = await searchParams;
  const today = getDateInTimeZone();
  const currentWeek = getWeekDateKeys(today);
  const historyFrom = shiftDate(currentWeek[0], -7);
  const historyTo = shiftDate(currentWeek[6], 1);
  const [taskHistory, weeklyPlan, transactions, completions, sessions, reflection] =
    await Promise.all([
      getTasks(supabase, user.id, { includeHistory: true }),
      ensureFitnessPlan(supabase, user.id, today),
      getFinanceTransactions(supabase, user.id),
      getTaskCompletions(supabase, user.id, historyFrom, historyTo),
      getFitnessSessions(supabase, user.id, historyFrom, historyTo),
      getWeeklyReflection(supabase, user.id, currentWeek[0]),
    ]);
  const visibleTasks = getVisibleTasks(taskHistory, today);
  const orderedTasks = sortDashboardTasks(visibleTasks, today);
  const taskStats = getTaskStats(visibleTasks);
  const fitnessStats = getFitnessStats(weeklyPlan, today);
  const finance = getFinanceSummary(transactions);
  const productivity = rescoreProductivity(getProductivityWeeks(
    taskHistory,
    completions,
    sessions,
    weeklyPlan,
    today,
  ), getEnabledDomains(params.domains));
  const review = getWeeklyReview(
    taskHistory,
    completions,
    sessions,
    transactions,
    productivity,
    today,
  );
  const filter = getTaskFilter(params.tasks);
  const quickTasks = filterTasks(orderedTasks, filter, today).slice(0, 6);
  const nextTask = orderedTasks.find((task) => !task.completed);
  const pendingFinance = [...transactions]
    .filter((transaction) => transaction.status !== "paid")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const trainingDays = weeklyPlan.filter((day) => day.sport !== "rest");
  const weeklyDone = trainingDays.filter((day) => day.log.completed).length;
  const fitnessPercent = trainingDays.length
    ? Math.round((weeklyDone / trainingDays.length) * 100)
    : 0;
  const financePercent =
    finance.income <= 0
      ? finance.netCashflow > 0
        ? 100
        : 0
      : Math.max(
          0,
          Math.min(100, Math.round((finance.netCashflow / finance.income) * 100)),
        );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_14%_12%,rgba(167,139,250,0.2),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(163,230,53,0.13),transparent_26%),radial-gradient(circle_at_62%_88%,rgba(96,165,250,0.12),transparent_28%),#0d0d0e] pb-24 text-[#e5e2e1] md:pb-10 md:pl-[112px]">
      <AppNavigation active="dashboard" />
      <section className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-8 xl:px-10">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-caps text-[#a3e635]">Overview</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-[38px] text-white sm:text-[40px] sm:leading-[46px]">
              Orbit command center
            </h1>
            <p className="mt-3 text-[14px] leading-6 text-[#c4c7c8]">
              {user.email} · your daily plan and weekly trajectory in one place.
            </p>
          </div>
        </header>

        <TodayStrip
          nextTask={nextTask}
          pendingFinance={pendingFinance}
          today={today}
          training={fitnessStats.todayTraining}
        />

        <section className="mt-5 grid auto-rows-min gap-4 sm:grid-cols-2 xl:grid-cols-12 xl:gap-5">
          <article className="glass-panel relative overflow-hidden rounded-[28px] p-5 sm:col-span-2 xl:col-span-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#a3e635]/10 blur-2xl" />
            <div className="relative grid gap-6 lg:grid-cols-[210px_1fr] lg:items-center">
              <div className="rounded-[34px] border border-white/10 bg-[#101011]/75 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <ActivityRings
                  finance={financePercent}
                  fitness={fitnessPercent}
                  tasks={taskStats.completionPercent}
                />
              </div>
              <div>
                <p className="label-caps text-[#c4c7c8]">Daily rings</p>
                <h2 className="mt-3 text-[28px] font-semibold leading-[34px] text-white">
                  Three signals, one view.
                </h2>
                <p className="mt-3 text-[14px] leading-6 text-[#c4c7c8]">
                  Tasks, dated training sessions, and paid monthly cashflow remain
                  separate signals with a shared visual rhythm.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <RingLegend color="#ff4fa3" label="Tasks" value={`${taskStats.completionPercent}%`} />
                  <RingLegend color="#a3e635" label="Fitness" value={`${weeklyDone}/${trainingDays.length}`} />
                  <RingLegend color="#60a5fa" label="Finance" value={formatCurrency(finance.netCashflow)} />
                </div>
              </div>
            </div>
          </article>

          <FitnessTodayCard training={fitnessStats.todayTraining} />

          <article className="glass-panel rounded-[24px] p-4 xl:col-span-3 xl:p-5">
            <p className="label-caps text-[#60a5fa]">Finance</p>
            <p className="mt-3 text-[28px] font-semibold text-white xl:mt-4 xl:text-[34px]">
              {formatCurrency(finance.availableBalance)}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#c4c7c8]">
              Balance from paid transactions.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 xl:mt-5 xl:gap-3">
              <MiniPill label="Income" value={formatCurrency(finance.income)} />
              <MiniPill label="Expense" value={formatCurrency(finance.expenses)} />
            </div>
          </article>

          <QuickTasksCard
            domainParam={params.domains}
            filter={filter}
            quickTasks={quickTasks}
            taskStats={taskStats}
            today={today}
            total={visibleTasks.length}
          />

          <section className="grid gap-4 sm:col-span-2 sm:grid-cols-2 xl:col-span-7 xl:gap-5">
            <CashflowChart monthlyCashflow={finance.monthlyCashflow} />
            <ProductivityChart
              current={productivity.current}
              enabledDomains={getEnabledDomains(params.domains)}
              filter={filter}
              previous={productivity.previous}
              today={today}
            />
          </section>

          <WeeklyReviewCard reflection={reflection} review={review} />
        </section>
      </section>
    </main>
  );
}

function TodayStrip({
  nextTask,
  pendingFinance,
  today,
  training,
}: {
  nextTask?: Task;
  pendingFinance?: import("@/lib/finance").FinanceTransaction;
  today: string;
  training: import("@/lib/fitness").TodayTraining;
}) {
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${today}T12:00:00Z`));

  return (
    <section className="glass-panel relative overflow-hidden rounded-[24px] p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#a3e635] via-[#ff4fa3] to-[#60a5fa]" />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-stretch">
        <div className="px-2">
          <p className="label-caps text-[#a3e635]">Today · {dateLabel}</p>
          <h2 className="mt-2 text-[22px] font-semibold text-white">
            {nextTask ? "Your next move is clear." : "Your task queue is clear."}
          </h2>
          <p className="mt-2 text-[13px] text-[#c4c7c8]">
            {nextTask
              ? `${nextTask.title} · ${formatRelativeTaskDate(nextTask, today)}`
              : "Use Quick Add when something new appears."}
          </p>
          <div className="mt-4"><QuickAdd /></div>
        </div>
        <Link
          className="rounded-[16px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#a3e635]/35"
          href="/fitness#training-calendar"
        >
          <p className="label-caps text-[#a3e635]">Workout</p>
          <p className="mt-2 text-[15px] font-semibold text-white">{training.title}</p>
          <p className="mt-1 text-[12px] text-[#8d9092]">
            {training.day.log.completed ? "Session complete" : `${training.day.log.durationMinutes} min planned`}
          </p>
        </Link>
        <Link
          className="rounded-[16px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#60a5fa]/35"
          href="/finance"
        >
          <p className="label-caps text-[#60a5fa]">Finance due</p>
          <p className="mt-2 truncate text-[15px] font-semibold text-white">
            {pendingFinance?.title ?? "No pending items"}
          </p>
          <p className="mt-1 text-[12px] text-[#8d9092]">
            {pendingFinance
              ? `${pendingFinance.date} · ${formatCurrency(pendingFinance.amount)}`
              : "Cashflow is up to date"}
          </p>
        </Link>
      </div>
    </section>
  );
}

function FitnessTodayCard({
  training,
}: {
  training: import("@/lib/fitness").TodayTraining;
}) {
  const canComplete = training.day.sport !== "rest";
  return (
    <article className="glass-panel relative overflow-hidden rounded-[24px] p-4 xl:col-span-3 xl:p-5">
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
            <button
              aria-label={training.day.log.completed ? "Reopen today's fitness" : "Complete today's fitness"}
              className={`grid h-12 w-12 place-items-center rounded-full border text-[18px] font-bold transition ${
                training.day.log.completed
                  ? "border-[#a3e635]/45 bg-[#a3e635] text-[#111112]"
                  : "border-white/15 bg-[#111112] text-transparent hover:border-[#a3e635]/60 hover:text-[#a3e635]"
              }`}
              type="submit"
            >
              ✓
            </button>
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
  quickTasks,
  taskStats,
  today,
  total,
}: {
  domainParam?: string;
  filter: TaskFilter;
  quickTasks: Task[];
  taskStats: ReturnType<typeof getTaskStats>;
  today: string;
  total: number;
}) {
  return (
    <article className="glass-panel rounded-[24px] p-5 sm:col-span-2 xl:col-span-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-caps text-[#ff4fa3]">Quick tasks</p>
          <h2 className="mt-2 text-[26px] font-semibold text-white">What matters next</h2>
        </div>
        <Link className="text-[12px] font-bold text-[#a3e635]" href="/tasks">View all</Link>
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
          </Link>
        ))}
        <span className="ml-auto rounded-full bg-[#ff4fa3]/12 px-3 py-1.5 text-[11px] font-semibold text-[#ffd1e5]">
          {taskStats.completedTasksCount}/{total}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {quickTasks.map((task) => (
          <form
            action={toggleTaskAction}
            className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-3 transition hover:border-white/20 hover:bg-[#262626]/70"
            key={task.id}
          >
            <input name="id" type="hidden" value={task.id} />
            <input name="completed" type="hidden" value={String(!task.completed)} />
            <button
              aria-label={task.completed ? "Reopen task" : "Complete task"}
              className={`grid h-8 w-8 place-items-center rounded-full border text-[14px] font-bold transition ${
                task.completed
                  ? "border-[#a3e635]/45 bg-[#a3e635] text-[#111112]"
                  : "border-white/15 bg-[#111112] text-transparent hover:border-[#a3e635]/60 hover:text-[#a3e635]"
              }`}
              type="submit"
            >
              ✓
            </button>
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
          <p className="rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-4 text-[13px] text-[#c4c7c8]">
            Nothing in this view. Try another filter or add a task.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function CashflowChart({ monthlyCashflow }: { monthlyCashflow: Array<{ expense: number; income: number; month: string }> }) {
  const max = Math.max(1, ...monthlyCashflow.flatMap((item) => [item.income, item.expense]));
  return (
    <article className="glass-panel rounded-[24px] p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="label-caps text-[#60a5fa]">Cashflow</p><h2 className="mt-2 text-[22px] font-semibold text-white">Monthly movement</h2></div>
        <Link className="shrink-0 text-[12px] font-semibold text-[#a3e635]" href="/finance">Open</Link>
      </div>
      <div aria-label="Monthly income and expense chart" className="flex h-48 items-end gap-2" role="img">
        {monthlyCashflow.map((month) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={month.month}>
            <div className="flex w-full flex-1 items-end justify-center gap-1 rounded-[14px] border border-white/10 bg-[#151516] px-1.5 pb-2">
              <div className="w-full max-w-6 rounded-t-[8px] bg-[#a3e635]" style={{ height: `${(month.income / max) * 100}%` }} />
              <div className="w-full max-w-6 rounded-t-[8px] bg-[#60a5fa]/55" style={{ height: `${(month.expense / max) * 100}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-[#c4c7c8]">{month.month.slice(5)}</span>
          </div>
        ))}
        {monthlyCashflow.length === 0 ? <div className="grid h-full w-full place-items-center rounded-[18px] border border-white/10 bg-[#201f1f]/55 px-4 text-center text-[13px] text-[#c4c7c8]">Import finance CSV to see cashflow.</div> : null}
      </div>
      <div className="mt-4 flex gap-4 text-[11px] font-semibold text-[#c4c7c8]"><ChartLegend color="#a3e635" label="Income" /><ChartLegend color="#60a5fa" label="Expense" /></div>
    </article>
  );
}

function ProductivityChart({ current, enabledDomains, filter, previous, today }: { current: ProductivityPoint[]; enabledDomains: ProductivityDomain[]; filter: TaskFilter; previous: ProductivityPoint[]; today: string }) {
  const chartX = (index: number) => 40 + index * 86.6;
  const chartY = (score: number) => 112 - score;
  const previousPoints = previous.map((point, index) => `${chartX(index)},${chartY(point.score ?? 0)}`).join(" ");
  const currentPoints = current.flatMap((point, index) => point.score === null ? [] : [`${chartX(index)},${chartY(point.score)}`]).join(" ");
  return (
    <article className="glass-panel rounded-[24px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="label-caps text-[#ff4fa3]">Productivity</p><h2 className="mt-2 text-[22px] font-semibold text-white">Reliable weekly score</h2></div>
        <span className="rounded-full bg-[#ff4fa3]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ffd1e5]">60 · 25 · 15</span>
      </div>
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
            </Link>
          );
        })}
      </div>
      <div className="relative mt-3 h-44" role="img" aria-label="Current and previous weekly productivity scores">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 600 130">
          {[12, 62, 112].map((y) => <line key={y} stroke="rgba(255,255,255,0.07)" x1="20" x2="580" y1={y} y2={y} />)}
          <polyline fill="none" points={previousPoints} stroke="rgba(196,199,200,0.28)" strokeDasharray="7 7" strokeWidth="3" />
          <polyline fill="none" points={currentPoints} stroke="#ff4fa3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {current.map((point, index) => point.score === null ? null : (
            <circle cx={chartX(index)} cy={chartY(point.score)} fill={point.date === today ? "#a3e635" : "#ff4fa3"} key={point.date} r={point.date === today ? 7 : 5}>
              <title>{`${point.label}: ${point.score}% — ${point.completedTasks}/${point.plannedTasks} tasks, ${point.completedFitness}/${point.plannedFitness} training, ${point.focusMinutes} focus min`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-7 text-center text-[10px] font-semibold text-[#c4c7c8]">
          {current.map((point) => <span className={point.date === today ? "text-[#a3e635]" : ""} key={point.date}>{point.label}</span>)}
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-[11px] font-semibold text-[#c4c7c8]"><ChartLegend color="#ff4fa3" label="This week" /><ChartLegend color="rgba(196,199,200,0.45)" label="Previous week" /></div>
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
    <article className="glass-panel rounded-[24px] p-5 sm:col-span-2 xl:col-span-12 xl:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="label-caps text-[#a78bfa]">Weekly review</p><h2 className="mt-2 text-[26px] font-semibold text-white">Close the loop</h2></div>
        <p className={`text-[13px] font-semibold ${scoreChange >= 0 ? "text-[#a3e635]" : "text-[#ff9f9f]"}`}>{scoreChange >= 0 ? "+" : ""}{scoreChange} points vs last week</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ReviewMetric label="Tasks" value={`${review.completedTasks}/${review.plannedTasks}`} detail={`${review.overdueCarried} overdue carried`} />
        <ReviewMetric label="Training" value={`${review.sessions} sessions`} detail={`${review.sessionMinutes} total minutes`} />
        <ReviewMetric label="Income" value={formatCurrency(review.income)} detail="Paid this week" />
        <ReviewMetric label="Expenses" value={formatCurrency(review.expenses)} detail="Paid this week" />
        <ReviewMetric label="Savings rate" value={`${review.savingsRate}%`} detail={`${review.score}% weekly score`} />
      </div>
      <form action={saveWeeklyReflectionAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="grid gap-2"><span className="label-caps text-[#c4c7c8]">What worked?</span><textarea className="field-input min-h-20 py-3" defaultValue={reflection.whatWorked} name="whatWorked" placeholder="One thing worth repeating…" /></label>
        <label className="grid gap-2"><span className="label-caps text-[#c4c7c8]">What changes next week?</span><textarea className="field-input min-h-20 py-3" defaultValue={reflection.changeNextWeek} name="changeNextWeek" placeholder="One deliberate adjustment…" /></label>
        <button className="h-11 rounded-[12px] bg-white px-5 text-[13px] font-bold text-[#202020]" type="submit">Save review</button>
      </form>
    </article>
  );
}

function ReviewMetric({ detail, label, value }: { detail: string; label: string; value: string }) { return <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4"><p className="label-caps text-[#8d9092]">{label}</p><p className="mt-2 text-[20px] font-semibold text-white">{value}</p><p className="mt-1 text-[11px] text-[#8d9092]">{detail}</p></div>; }
function ChartLegend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>; }

function ActivityRings({ finance, fitness, tasks }: { finance: number; fitness: number; tasks: number }) { return <div className="relative grid aspect-square place-items-center"><Ring color="#ff4fa3" radius={90} stroke={16} value={tasks} /><Ring color="#a3e635" radius={68} stroke={16} value={fitness} /><Ring color="#60a5fa" radius={46} stroke={16} value={finance} /><div className="absolute grid h-20 w-20 place-items-center rounded-full bg-[#0d0d0e] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"><span className="text-[24px] font-semibold text-white">{Math.round((tasks + fitness + finance) / 3)}</span></div></div>; }
function Ring({ color, radius, stroke, value }: { color: string; radius: number; stroke: number; value: number }) { const circumference = 2 * Math.PI * radius; const offset = circumference - (Math.max(0, Math.min(value, 100)) / 100) * circumference; return <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 220 220"><circle cx="110" cy="110" fill="none" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} /><circle cx="110" cy="110" fill="none" r={radius} stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth={stroke} /></svg>; }
function RingLegend({ color, label, value }: { color: string; label: string; value: string }) { return <div className="flex items-center justify-between rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-3"><span className="inline-flex items-center gap-2 text-[13px] font-semibold text-white"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</span><span className="text-[13px] font-semibold text-[#c4c7c8]">{value}</span></div>; }
function MiniPill({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] border border-white/10 bg-[#201f1f]/60 p-3"><p className="label-caps text-[#8d9092]">{label}</p><p className="mt-2 text-[15px] font-semibold text-white">{value}</p></div>; }
