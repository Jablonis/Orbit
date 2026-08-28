import Link from "next/link";
import { DayTile } from "@/components/overview/DayTile";
import { PIP_KITS, getPanelPip } from "@/lib/mascot";
import type { DailyRingMetric } from "@/lib/dashboard";
import type { TodayTraining } from "@/lib/fitness";
import { getTaskStats } from "@/lib/tasks";
import { TrainingToggle } from "@/components/overview/TrainingToggle";

const button =
  "ui-button ui-button--secondary h-10 min-h-10 w-full px-3 text-[12px]";
// A tile's own colour on its own action: a plum button on the green card reads
// as something borrowed from somewhere else on the page.
const fitnessPrimary =
  "ui-button h-10 min-h-10 w-full bg-fitness px-3 text-[12px] text-white transition-colors hover:bg-fitness/90";

/**
 * The three things a day is actually made of.
 *
 * The orbit above says how the day is going; these say what it is made of —
 * the list, the session, and whatever this account decided to keep doing. The
 * third one is the only one Orbit cannot write for you, which is why an empty
 * habits tile invites rather than reports.
 */
export function DayTiles({
  habits,
  taskStats,
  training,
}: {
  habits: DailyRingMetric;
  taskStats: ReturnType<typeof getTaskStats>;
  training: TodayTraining;
}) {
  const open = taskStats.activeTasksCount;
  const totalTasks = taskStats.completedTasksCount + open;
  const resting = training.day.sport === "rest";
  const trained = training.day.log.completed;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {/* Tasks: how much of the list is behind you. */}
      <DayTile
        action={
          <Link className={button} href="/tasks#new-task">
            New task
          </Link>
        }
        eyebrow="Tasks"
        meta={totalTasks > 0 ? `${taskStats.completedTasksCount}/${totalTasks}` : undefined}
        pip={getPanelPip(
          taskStats.completedTasksCount,
          totalTasks,
          "tasks",
          PIP_KITS.tasks,
        )}
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
            <TrainingToggle
              className={fitnessPrimary}
              date={training.day.date}
              doneClassName={button}
              trained={trained}
            />
          )
        }
        eyebrow={
          resting ? "Fitness" : `Fitness · ${training.day.plannedDurationMinutes} min`
        }
        pip={getPanelPip(
          trained ? 1 : 0,
          resting ? 0 : 1,
          "training",
          training.day.sport === "tennis" ? PIP_KITS.tennis : PIP_KITS.fitness,
        )}
        progress={resting ? null : trained ? 1 : 0}
        seed={7}
        title={resting ? "Recovery day." : training.title}
        tone="fitness"
      />

      {/* Habits: the pillar you named yourself. Full width on a phone, where
          two columns and a third orphan reads as a mistake. */}
      <DayTile
        action={
          <Link className={button} href="/habits">
            {habits.total > 0 ? "Open habits" : "Add a habit"}
          </Link>
        }
        eyebrow="Habits"
        meta={habits.total > 0 ? `${habits.completed}/${habits.total}` : undefined}
        pip={
          habits.total > 0
            ? getPanelPip(habits.completed, habits.total, "habits", PIP_KITS.habits)
            : undefined
        }
        progress={habits.total > 0 ? habits.completed / habits.total : null}
        seed={8}
        title={
          habits.total === 0
            ? "Name your own third thing."
            : habits.completed === habits.total
              ? "All of them kept."
              : `${habits.total - habits.completed} still to keep.`
        }
        tone="plum"
        wide
      />
    </div>
  );
}
