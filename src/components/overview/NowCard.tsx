import Link from "next/link";
import { LinkPendingIndicator } from "@/components/LinkPendingIndicator";
import { OpenQuickAddButton } from "@/components/OpenQuickAddButton";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { DayAscent } from "@/components/DayAscent";
import { TintPanel } from "@/components/ui/tint-panel";
import { getAscent } from "@/lib/ascent";
import type { getDailyRings } from "@/lib/dashboard";
import type { TodayTraining } from "@/lib/fitness";
import { type Task, formatRelativeTaskDate } from "@/lib/tasks";
import { toggleFitnessDoneFormAction } from "@/app/fitness/actions";
import { toggleTaskAction } from "@/app/tasks/actions";

/**
 * The first thing on the phone.
 *
 * Opening Orbit used to mean reading a chart before finding out what to do, and
 * the one actionable line sat below the fold under a ring the size of a fist.
 * This is the inverse: one move, named, with the button that finishes it and
 * the button that adds another — and the day's rings shrunk to the badge they
 * deserve at this size.
 */
export function NowCard({
  dailyRings,
  nextTask,
  today,
  todayScore,
  timeZone,
  training,
}: {
  dailyRings: ReturnType<typeof getDailyRings>;
  nextTask?: Task;
  today: string;
  todayScore: number | null;
  timeZone: string;
  training: TodayTraining;
}) {
  const trainingDue =
    training.day.sport !== "rest" && !training.day.log.completed;
  const ascent = getAscent({
    areas: [
      { ...dailyRings.tasks, label: "Tasks", system: "tasks" as const },
      { ...dailyRings.fitness, label: "Fitness", system: "fitness" as const },
      { ...dailyRings.finance, label: "Finance", system: "finance" as const },
    ],
    todayScore,
  });

  // A task first, then an unlogged session, then nothing — in the order the day
  // actually asks for them.
  const move = nextTask
    ? {
        detail: `${nextTask.category} · ${formatRelativeTaskDate(nextTask, today, timeZone)}`,
        title: nextTask.title,
      }
    : trainingDue
      ? {
          detail: `${training.day.plannedDurationMinutes} min · ${training.focus}`,
          title: training.title,
        }
      : null;

  return (
    <TintPanel className="settle-in flex flex-col gap-4" system="plum">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label-caps text-plum-ink">
            {move ? "Now" : "Nothing due"}
          </p>
          <p className="mt-1.5 text-[22px] font-bold leading-7 tracking-[-0.03em]">
            {move?.title ?? "Your day is clear."}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {move?.detail ?? "Add something only if it deserves your attention."}
          </p>
        </div>

        <Link
          aria-label={`${ascent.closed} of ${ascent.total} stages done today`}
          className="shrink-0 rounded-xl transition-transform duration-150 active:scale-[0.96]"
          href="#today-rings"
        >
          <DayAscent ascent={ascent} compact />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {nextTask ? (
          <form action={toggleTaskAction}>
            <input name="taskId" type="hidden" value={nextTask.id} />
            <input name="completed" type="hidden" value="true" />
            <input name="redirectTo" type="hidden" value="/" />
            <PendingSubmitButton
              className="ui-button ui-button--primary h-11 px-5"
              pendingLabel="Done…"
            >
              Mark done
            </PendingSubmitButton>
          </form>
        ) : trainingDue ? (
          <form action={toggleFitnessDoneFormAction}>
            <input name="date" type="hidden" value={training.day.date} />
            <input name="completed" type="hidden" value="true" />
            <input name="redirectTo" type="hidden" value="/" />
            <PendingSubmitButton
              className="ui-button ui-button--primary"
              pendingLabel="Logging…"
            >
              Log the session
            </PendingSubmitButton>
          </form>
        ) : null}

        <OpenQuickAddButton />

        {move ? (
          <Link
            className="ui-button h-11 min-h-11 px-4 text-muted-foreground hover:text-foreground"
            href={nextTask ? "/tasks" : "/fitness#training-calendar"}
          >
            Something else
            <LinkPendingIndicator label="Opening the list" />
          </Link>
        ) : null}
      </div>
    </TintPanel>
  );
}
