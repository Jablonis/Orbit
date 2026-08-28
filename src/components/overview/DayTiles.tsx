import Link from "next/link";
import { DayTile } from "@/components/overview/DayTile";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { getPanelPip } from "@/lib/mascot";
import type { TodayTraining } from "@/lib/fitness";
import { getTaskStats } from "@/lib/tasks";
import { toggleFitnessDoneFormAction } from "@/app/fitness/actions";

const button =
  "ui-button ui-button--secondary h-10 min-h-10 w-full px-3 text-[12px]";
// A tile's own colour on its own action: a plum button on the green card reads
// as something borrowed from somewhere else on the page.
const fitnessPrimary =
  "ui-button h-10 min-h-10 w-full bg-fitness px-3 text-[12px] text-white transition-colors hover:bg-fitness/90";

/**
 * The two things a day is actually made of.
 *
 * The orbit above says how the day is going; these say what it is made of —
 * the list and the session — each with the one control that changes it. There
 * was a third tile carrying "the next move", and it was the list's first row
 * with a bigger font on it.
 */
export function DayTiles({
  taskStats,
  training,
}: {
  taskStats: ReturnType<typeof getTaskStats>;
  training: TodayTraining;
}) {
  const open = taskStats.activeTasksCount;
  const totalTasks = taskStats.completedTasksCount + open;
  const resting = training.day.sport === "rest";
  const trained = training.day.log.completed;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

    </div>
  );
}
