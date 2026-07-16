import Link from "next/link";
import { AppNavigation } from "@/components/AppNavigation";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  type WeeklyPlanDay,
  ensureFitnessPlan,
  getFitnessStats,
  sportLabels,
} from "@/lib/fitness";
import {
  formatCurrency,
  getFinanceSummary,
  getFinanceTransactions,
} from "@/lib/finance";
import {
  type Task,
  getDateInTimeZone,
  getTaskStats,
  getTasks,
  getVisibleTasks,
} from "@/lib/tasks";
import { toggleFitnessDoneAction } from "./fitness/actions";
import { toggleTaskAction } from "./tasks/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { supabase, user } = await getAuthenticatedUser();
  const [taskHistory, weeklyPlan, transactions] = await Promise.all([
    getTasks(supabase, { includeHistory: true }),
    ensureFitnessPlan(supabase, user.id),
    getFinanceTransactions(supabase),
  ]);
  const today = getDateInTimeZone();
  const tasks = getVisibleTasks(taskHistory, today);
  const taskStats = getTaskStats(tasks);
  const fitnessStats = getFitnessStats(weeklyPlan);
  const finance = getFinanceSummary(transactions);
  const productivityWeek = getProductivityWeek(taskHistory, weeklyPlan, today);
  const weeklyDone = weeklyPlan.filter((day) => day.log.completed).length;
  const fitnessPercent = Math.round((weeklyDone / 7) * 100);
  const financePercent =
    finance.income <= 0
      ? finance.netCashflow > 0
        ? 100
        : 0
      : Math.max(0, Math.min(100, Math.round((finance.netCashflow / finance.income) * 100)));

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_14%_12%,rgba(167,139,250,0.2),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(163,230,53,0.13),transparent_26%),radial-gradient(circle_at_62%_88%,rgba(96,165,250,0.12),transparent_28%),#0d0d0e] pb-24 text-[#e5e2e1] md:pb-0 md:pl-[112px]">
      <AppNavigation active="dashboard" />
      <section className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-8 xl:px-10">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-caps text-[#a3e635]">Overview</p>
            <h1 className="mt-2 text-[32px] font-semibold leading-[38px] text-white sm:text-[40px] sm:leading-[46px]">
              Orbit command center
            </h1>
            <p className="mt-3 text-[14px] leading-6 text-[#c4c7c8]">
              {user.email} · fitness, tasks and finance synced from Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full border border-white/10 bg-[#201f1f] px-4 py-2 text-[13px] font-semibold text-[#c4c7c8]" href="/fitness">
              Fitness
            </Link>
            <Link className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#202020]" href="/tasks">
              Add task
            </Link>
          </div>
        </header>

        <section className="grid auto-rows-min gap-4 sm:grid-cols-2 xl:grid-cols-12 xl:gap-5">
          <article className="glass-panel relative order-2 overflow-hidden rounded-[28px] p-5 sm:col-span-2 xl:order-1 xl:col-span-6">
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
                  Tasks, weekly training and monthly cashflow stay separated, but the
                  overview shows how the day is really moving.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <RingLegend color="#ff4fa3" label="Tasks" value={`${taskStats.completionPercent}%`} />
                  <RingLegend color="#a3e635" label="Fitness" value={`${weeklyDone}/7`} />
                  <RingLegend color="#60a5fa" label="Finance" value={formatCurrency(finance.netCashflow)} />
                </div>
              </div>
            </div>
          </article>

          <article className="glass-panel relative order-3 overflow-hidden rounded-[24px] p-4 xl:order-2 xl:col-span-3 xl:p-5">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-[#a3e635]/10" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="label-caps text-[#a3e635]">Fitness today</p>
                <h2 className="mt-3 text-[24px] font-semibold leading-[30px] text-white xl:mt-4 xl:text-[30px] xl:leading-[36px]">
                  {fitnessStats.todayTraining.title}
                </h2>
              </div>
              <form action={toggleFitnessDoneAction}>
                <input
                  name="weekday"
                  type="hidden"
                  value={fitnessStats.todayTraining.day.id}
                />
                <input
                  name="sport"
                  type="hidden"
                  value={fitnessStats.todayTraining.day.sport}
                />
                <input
                  name="completed"
                  type="hidden"
                  value={String(!fitnessStats.todayTraining.day.log.completed)}
                />
                <button
                  aria-label={
                    fitnessStats.todayTraining.day.log.completed
                      ? "Reopen today's fitness"
                      : "Complete today's fitness"
                  }
                  className={`grid h-12 w-12 place-items-center rounded-full border text-[18px] font-bold transition ${
                    fitnessStats.todayTraining.day.log.completed
                      ? "border-[#a3e635]/45 bg-[#a3e635] text-[#111112]"
                      : "border-white/15 bg-[#111112] text-transparent hover:border-[#a3e635]/60 hover:text-[#a3e635]"
                  }`}
                  type="submit"
                >
                  ✓
                </button>
              </form>
            </div>
            <p className="relative mt-3 text-[14px] leading-6 text-[#c4c7c8]">
              {fitnessStats.todayTraining.day.label} ·{" "}
              {sportLabels[fitnessStats.todayTraining.day.sport]}
            </p>
            <p className="relative mt-2 text-[12px] font-semibold text-[#a3e635]">
              {fitnessStats.todayTraining.day.log.completed
                ? "Marked done"
                : "Click the circle when done"}
            </p>
            <div className="relative mt-3 rounded-[16px] border border-white/10 bg-[#201f1f]/60 p-3 xl:mt-4 xl:rounded-[18px] xl:p-4">
              <p className="text-[13px] leading-5 text-white xl:text-[14px] xl:leading-6">
                {fitnessStats.todayTraining.focus}
              </p>
            </div>
          </article>

          <article className="glass-panel order-4 rounded-[24px] p-4 xl:order-3 xl:col-span-3 xl:p-5">
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

          <article className="glass-panel order-1 rounded-[24px] p-5 sm:col-span-2 xl:order-4 xl:col-span-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-caps text-[#ff4fa3]">Quick tasks</p>
                <h2 className="mt-2 text-[26px] font-semibold text-white">
                  Click done
                </h2>
              </div>
              <span className="rounded-full bg-[#ff4fa3]/12 px-3 py-1.5 text-[12px] font-semibold text-[#ffd1e5]">
                {taskStats.completedTasksCount}/{tasks.length}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {tasks.slice(0, 6).map((task) => (
                <form
                  action={toggleTaskAction}
                  className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-3 transition hover:border-white/18 hover:bg-[#262626]/70"
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
                    <p
                      className={`truncate text-[14px] font-semibold ${
                        task.completed ? "text-[#8d9092] line-through" : "text-white"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#c4c7c8]">
                      {task.category} · {task.completed ? "Done" : task.priority}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#c4c7c8]">
                    {task.completed ? "reopen" : "done"}
                  </span>
                </form>
              ))}
              {tasks.length === 0 ? (
                <p className="rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-3 text-[13px] text-[#c4c7c8]">
                  No tasks yet.
                </p>
              ) : null}
            </div>
          </article>

          <section className="order-5 grid gap-4 sm:col-span-2 sm:grid-cols-2 xl:col-span-7 xl:gap-5">
            <CashflowChart monthlyCashflow={finance.monthlyCashflow} />
            <ProductivityChart points={productivityWeek} />
          </section>
        </section>
      </section>
    </main>
  );
}

function CashflowChart({
  monthlyCashflow,
}: {
  monthlyCashflow: Array<{ expense: number; income: number; month: string }>;
}) {
  const max = Math.max(
    1,
    ...monthlyCashflow.flatMap((item) => [item.income, item.expense]),
  );

  return (
    <article className="glass-panel rounded-[24px] p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-[#60a5fa]">Cashflow</p>
          <h2 className="mt-2 text-[22px] font-semibold text-white">
            Monthly movement
          </h2>
        </div>
        <Link className="shrink-0 text-[12px] font-semibold text-[#a3e635]" href="/finance">
          Open
        </Link>
      </div>
      <div
        aria-label="Monthly income and expense chart"
        className="flex h-48 items-end gap-2"
        role="img"
      >
        {monthlyCashflow.map((month) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={month.month}>
            <div className="flex w-full flex-1 items-end justify-center gap-1 rounded-[14px] border border-white/10 bg-[#151516] px-1.5 pb-2">
              <div
                className="w-full max-w-6 rounded-t-[8px] bg-[#a3e635] shadow-[0_0_18px_rgba(163,230,53,0.18)]"
                style={{ height: `${(month.income / max) * 100}%` }}
              />
              <div
                className="w-full max-w-6 rounded-t-[8px] bg-[#60a5fa]/55"
                style={{ height: `${(month.expense / max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#c4c7c8]">
              {month.month.slice(5)}
            </span>
          </div>
        ))}
        {monthlyCashflow.length === 0 ? (
          <div className="grid h-full w-full place-items-center rounded-[18px] border border-white/10 bg-[#201f1f]/55 px-4 text-center text-[13px] text-[#c4c7c8]">
            Import finance CSV to see cashflow.
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex gap-4 text-[11px] font-semibold text-[#c4c7c8]">
        <ChartLegend color="#a3e635" label="Income" />
        <ChartLegend color="#60a5fa" label="Expense" />
      </div>
    </article>
  );
}

type ProductivityPoint = {
  date: string;
  fitness: number;
  label: string;
  tasks: number;
};

function ProductivityChart({ points }: { points: ProductivityPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.tasks + point.fitness));
  const completedActions = points.reduce(
    (total, point) => total + point.tasks + point.fitness,
    0,
  );

  return (
    <article className="glass-panel rounded-[24px] p-4 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="label-caps text-[#ff4fa3]">Productivity</p>
          <h2 className="mt-2 text-[22px] font-semibold text-white">Weekly output</h2>
        </div>
        <span className="rounded-full bg-[#ff4fa3]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ffd1e5]">
          {completedActions} done
        </span>
      </div>
      <div
        aria-label="Weekly productivity chart with completed tasks and fitness sessions"
        className="flex h-48 items-end gap-2"
        role="img"
      >
        {points.map((point) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.date}>
            <div className="flex w-full flex-1 flex-col-reverse overflow-hidden rounded-t-[10px] border border-white/10 bg-[#151516]">
              {point.tasks > 0 ? (
                <div
                  className="w-full bg-[#ff4fa3] shadow-[0_0_18px_rgba(255,79,163,0.2)]"
                  style={{ height: `${(point.tasks / max) * 100}%` }}
                />
              ) : null}
              {point.fitness > 0 ? (
                <div
                  className="w-full bg-[#a3e635]"
                  style={{ height: `${(point.fitness / max) * 100}%` }}
                />
              ) : null}
              <span className="sr-only">
                {point.label}: {point.tasks} tasks and {point.fitness} fitness sessions
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#c4c7c8]">
              {point.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-[11px] font-semibold text-[#c4c7c8]">
        <ChartLegend color="#ff4fa3" label="Tasks" />
        <ChartLegend color="#a3e635" label="Fitness" />
      </div>
    </article>
  );
}

function getProductivityWeek(
  tasks: Task[],
  weeklyPlan: WeeklyPlanDay[],
  today: string,
): ProductivityPoint[] {
  const currentDate = new Date(`${today}T12:00:00Z`);
  const monday = new Date(currentDate);
  monday.setUTCDate(currentDate.getUTCDate() - ((currentDate.getUTCDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const taskCompletions = tasks.filter(
      (task) =>
        task.completed && getDateInTimeZone(task.updatedAt ?? "") === dateKey,
    ).length;

    return {
      date: dateKey,
      fitness: weeklyPlan[index]?.log.completed ? 1 : 0,
      label: new Intl.DateTimeFormat("en", {
        timeZone: "UTC",
        weekday: "short",
      }).format(date),
      tasks: taskCompletions,
    };
  });
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ActivityRings({
  finance,
  fitness,
  tasks,
}: {
  finance: number;
  fitness: number;
  tasks: number;
}) {
  return (
    <div className="relative grid aspect-square place-items-center">
      <Ring color="#ff4fa3" radius={90} stroke={16} value={tasks} />
      <Ring color="#a3e635" radius={68} stroke={16} value={fitness} />
      <Ring color="#60a5fa" radius={46} stroke={16} value={finance} />
      <div className="absolute grid h-20 w-20 place-items-center rounded-full bg-[#0d0d0e] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <span className="text-[24px] font-semibold text-white">
          {Math.round((tasks + fitness + finance) / 3)}
        </span>
      </div>
    </div>
  );
}

function Ring({
  color,
  radius,
  stroke,
  value,
}: {
  color: string;
  radius: number;
  stroke: number;
  value: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(value, 100)) / 100) * circumference;

  return (
    <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 220 220">
      <circle
        cx="110"
        cy="110"
        fill="none"
        r={radius}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
      />
      <circle
        cx="110"
        cy="110"
        fill="none"
        r={radius}
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={stroke}
      />
    </svg>
  );
}

function RingLegend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border border-white/10 bg-[#201f1f]/55 p-3">
      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-white">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="text-[13px] font-semibold text-[#c4c7c8]">{value}</span>
    </div>
  );
}

function MiniPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-[#201f1f]/60 p-3">
      <p className="label-caps text-[#8d9092]">{label}</p>
      <p className="mt-2 text-[15px] font-semibold text-white">{value}</p>
    </div>
  );
}
