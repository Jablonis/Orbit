import Link from "next/link";
import { DayTile } from "@/components/overview/DayTile";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { OpenQuickAddButton } from "@/components/OpenQuickAddButton";
import { getPanelPip } from "@/lib/mascot";
import type { Momentum } from "@/lib/momentum";
import type { TodayTraining } from "@/lib/fitness";
import { formatReward } from "@/lib/reward";
import { type Task, getTaskStats } from "@/lib/tasks";
import { toggleFitnessDoneFormAction } from "@/app/fitness/actions";
import { toggleTaskAction } from "@/app/tasks/actions";

const button =
  "ui-button ui-button--secondary h-10 min-h-10 w-full px-3 text-[12px]";
const primary =
  "ui-button ui-button--primary h-10 min-h-10 w-full px-3 text-[12px]";
// A tile's own colour on its own action: a plum button on the green card reads
// as something borrowed from somewhere else on the page.
const fitnessPrimary =
  "ui-button h-10 min-h-10 w-full bg-fitness px-3 text-[12px] text-white transition-colors hover:bg-fitness/90";

/**
 * The day, in four tiles.
 *
 * Everything above them used to be one hero card carrying the next move, and
 * everything below it a stack of full-width panels saying the same four things
 * at length. This is the whole answer on one screen: what is next, what is on
 * the list, what the body is doing, and how the orbit is holding — each with
 * the one control that changes it.
 *
 * Anything that needs more room than a tile has a page of its own, and the
 * history sits under the fold where history belongs.
 */
export function DayTiles({
  momentum,
  nextTask,
  reward,
  taskStats,
  today,
  training,
}: {
  momentum: Momentum;
  nextTask?: Task;
  reward: number;
  taskStats: ReturnType<typeof getTaskStats>;
  today: string;
  training: TodayTraining;
}) {
  const open = taskStats.activeTasksCount;
  const totalTasks = taskStats.completedTasksCount + open;
  const resting = training.day.sport === "rest";
  const trained = training.day.log.completed;
  const trainingDue = !resting && !trained;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* Now: the single move, and the button that finishes it. */}
      <DayTile
        action={
          nextTask ? (
            <form action={toggleTaskAction}>
              <input name="id" type="hidden" value={nextTask.id} />
              <input name="completed" type="hidden" value="true" />
              <input name="date" type="hidden" value={today} />
              <input name="redirectTo" type="hidden" value="/" />
              <PendingSubmitButton className={primary} pendingLabel="Done…">
                {reward > 0 ? `Done · ${formatReward(reward)}` : "Mark done"}
              </PendingSubmitButton>
            </form>
          ) : trainingDue ? (
            <form action={toggleFitnessDoneFormAction}>
              <input name="date" type="hidden" value={training.day.date} />
              <input name="completed" type="hidden" value="true" />
              <input name="redirectTo" type="hidden" value="/" />
              <PendingSubmitButton className={fitnessPrimary} pendingLabel="Logging…">
                Log session
              </PendingSubmitButton>
            </form>
          ) : (
            <OpenQuickAddButton className={button} label="Add something" />
          )
        }
        eyebrow="Now"
        meta={momentum.todayScore === null ? undefined : `${momentum.todayScore}%`}
        progress={(momentum.todayScore ?? 0) / 100}
        title={
          nextTask?.title ??
          (trainingDue ? training.title : "Your day is clear.")
        }
        tone="plum"
      />

      {/* Tasks: how much of the list is behind you. */}
      <DayTile
        action={
          <Link className={button} href="/tasks#new-task">
            New task
          </Link>
        }
        eyebrow="Tasks"
        meta={totalTasks > 0 ? `${taskStats.completedTasksCount}/${totalTasks}` : undefined}
        pip={getPanelPip(taskStats.completedTasksCount, totalTasks, "tasks")}
        progress={totalTasks > 0 ? taskStats.completedTasksCount / totalTasks : 0}
        seed={6}
        title={
          totalTasks === 0
            ? "Nothing on the list."
            : open === 0
              ? "Everything is done."
              : `${open} still open.`
        }
        tone="tasks"
      />

      {/* Fitness: what the body is doing today. */}
      <DayTile
        action={
          resting ? (
            <Link className={button} href="/fitness">
              Open fitness
            </Link>
          ) : (
            <form action={toggleFitnessDoneFormAction}>
              <input name="date" type="hidden" value={training.day.date} />
              <input
                name="completed"
                type="hidden"
                value={trained ? "false" : "true"}
              />
              <input name="redirectTo" type="hidden" value="/" />
              <PendingSubmitButton
                className={trained ? button : fitnessPrimary}
                pendingLabel="Saving…"
              >
                {trained ? "Not done" : "Mark done"}
              </PendingSubmitButton>
            </form>
          )
        }
        eyebrow={
          resting ? "Fitness" : `Fitness · ${training.day.plannedDurationMinutes} min`
        }
        pip={getPanelPip(trained ? 1 : 0, resting ? 0 : 1, "training")}
        progress={resting ? null : trained ? 1 : 0}
        seed={7}
        title={resting ? "Recovery day." : training.title}
        tone="fitness"
      />

      {/* Momentum: where the orbit is, without the instrument. */}
      <DayTile
        action={
          <Link className={button} href="#trends-title">
            The numbers
          </Link>
        }
        eyebrow="Momentum"
        meta={momentum.tier.name}
        progress={momentum.altitude / 100}
        title={`${Math.round(momentum.altitude)} altitude`}
        tone="quiet"
      />
    </div>
  );
}
