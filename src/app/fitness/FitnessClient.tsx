"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionToast } from "@/components/ActionToast";
import { Pip } from "@/components/brand/Pip";
import { getTrainingGuidance } from "@/lib/training-guidance";
import { PIP_KITS, getPanelPip } from "@/lib/mascot";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TrainingBlockPanel } from "@/components/fitness/TrainingBlockPanel";
import {
  BlockSessionLog,
  type BlockSessionLogProps,
} from "@/components/fitness/BlockSessionLog";
import {
  SportType,
  TrainingQuality,
  TodayTraining,
  WeekdayId,
  WeeklyPlanDay,
  defaultWeeklyPlan,
  getTrainingForDay,
  qualityLabels,
  sportDescriptions,
  sportLabels,
  weekdayOrder,
} from "@/lib/fitness";
import {
  resetFitnessPlanAction,
  saveFitnessLogAction,
  updateFitnessDayAction,
} from "./actions";

const sportOptions: SportType[] = ["gym", "tennis", "cardio", "mobility", "rest"];
const qualityOptions: TrainingQuality[] = ["low", "medium", "high"];

type Notice = {
  dayId: WeekdayId;
  tone: "error" | "success";
  text: string;
};

export function FitnessClient({
  programme,
  sessionLogs,
  stats,
  weeklyPlan,
}: {
  programme: ComponentProps<typeof TrainingBlockPanel>;
  sessionLogs: Partial<Record<WeekdayId, BlockSessionLogProps>>;
  stats: {
    completedSessionsCount: number;
    gymDaysCount: number;
    restDaysCount: number;
    todayTraining: TodayTraining;
  };
  weeklyPlan: WeeklyPlanDay[];
}) {
  const [localPlan, setLocalPlan] = useState(weeklyPlan);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Which screen this is. Read from the URL rather than held in state, so each
  // one has its own address and the phone's Back button does what it looks
  // like it does. The page used to be all four at once, which on a 390px
  // screen meant none of them.
  const view = fitnessView(searchParams.get("view"));
  // Nobody goes looking for a finished block, so the door says so.
  const programmeDetail = programme.active
    ? programme.week > programme.weeks
      ? `Block ${programme.active.blockIndex} has finished — start the next one.`
      : `Block ${programme.active.blockIndex}, week ${programme.week} of ${programme.weeks}.`
    : "Six weeks of the same sessions, every muscle group twice a week.";
  const [mode, setMode] = useState<"plan" | "review">("review");
  // Seeded from the URL so a tap on the week strip arrives with that day
  // already open, rather than on a list you then have to find it in.
  const [openDayId, setOpenDayId] = useState<WeekdayId | null>(() => {
    const asked = searchParams.get("day");
    return isWeekdayId(asked) ? asked : null;
  });
  const [pendingDayId, setPendingDayId] = useState<WeekdayId | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [resetNotice, setResetNotice] = useState("");
  const [, startTransition] = useTransition();

  const todayDay =
    localPlan.find((day) => day.id === stats.todayTraining.day.id) ?? localPlan[0];
  const todayTraining = getTrainingForDay(localPlan, todayDay.id);
  const openDay = openDayId
    ? localPlan.find((day) => day.id === openDayId) ?? null
    : null;
  const focusDay = openDay ?? todayDay;
  const focusSport =
    focusDay.log.completed && focusDay.log.sport
      ? focusDay.log.sport
      : focusDay.sport;
  const focusTraining = getTrainingForDay(
    localPlan.map((day) =>
      day.id === focusDay.id ? { ...day, sport: focusSport } : day,
    ),
    focusDay.id,
  );
  const guidance = getTrainingGuidance(focusDay.sport, focusTraining.title);
  const todayGuidance = getTrainingGuidance(todayDay.sport, todayTraining.title);
  const trainingDaysCount = localPlan.filter((day) => day.sport !== "rest").length;
  const completedSessionsCount = localPlan.filter(
    (day) => day.log.completed,
  ).length;
  const completedDuration = localPlan
    .filter((day) => day.log.completed)
    .reduce((total, day) => total + day.log.durationMinutes, 0);

  function updateSport(dayId: WeekdayId, sport: SportType) {
    const previousDay = localPlan.find((day) => day.id === dayId);
    setNotice(null);
    setLocalPlan((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              sport:
                day.date >= stats.todayTraining.day.date ? sport : day.sport,
              templateSport: sport,
            }
          : day,
      ),
    );

    const formData = new FormData();
    formData.set("weekday", dayId);
    formData.set("sport", sport);

    startTransition(async () => {
      try {
        const result = await updateFitnessDayAction(formData);
        if (!result.ok) {
          if (previousDay) {
            setLocalPlan((current) =>
              current.map((day) => (day.id === dayId ? previousDay : day)),
            );
          }
          setNotice({ dayId, tone: "error", text: result.error });
          return;
        }
        // The chip changes the instant it is pressed, because the change is
        // applied locally first — so without this, a save and a failure that
        // rolls back both looked like the same successful press. Logging a
        // session has said so since the day it shipped; editing the plan, the
        // one thing on this screen that changes every week from now on, said
        // nothing at all.
        setNotice({
          dayId,
          tone: "success",
          text: `${previousDay?.label ?? "That day"} is now ${sportLabels[
            sport
          ].toLocaleLowerCase()} — saved to your plan.`,
        });
      } catch {
        if (previousDay) {
          setLocalPlan((current) =>
            current.map((day) => (day.id === dayId ? previousDay : day)),
          );
        }
        setNotice({
          dayId,
          tone: "error",
          text: "The training plan could not be saved. Please try again.",
        });
      }
    });
  }

  async function saveTrainingLog(formData: FormData) {
    const weekday = String(formData.get("weekday")) as WeekdayId;
    const sport = String(formData.get("sport")) as SportType;
    const previousDay = localPlan.find((day) => day.id === weekday);
    const completed =
      sport !== "rest" && String(formData.get("completed") ?? "") === "on";
    const durationMinutes = Number(formData.get("durationMinutes") ?? 60);
    const quality = String(formData.get("quality") ?? "medium") as TrainingQuality;
    const time = String(formData.get("time") ?? "");
    const notes = String(formData.get("notes") ?? "");

    setPendingDayId(weekday);
    setNotice(null);
    setLocalPlan((current) =>
      current.map((day) =>
        day.id === weekday
          ? {
              ...day,
              log: {
                completed,
                durationMinutes,
                notes,
                quality,
                sport: sport === "rest" ? null : sport,
                time,
              },
            }
          : day,
      ),
    );

    try {
      const result = await saveFitnessLogAction(formData);
      if (!result.ok) {
        if (previousDay) {
          setLocalPlan((current) =>
            current.map((day) => (day.id === weekday ? previousDay : day)),
          );
        }
        setNotice({ dayId: weekday, tone: "error", text: result.error });
      } else {
        setNotice({
          dayId: weekday,
          tone: "success",
          text: completed ? "Training saved as done." : "Training details saved.",
        });
      }
    } catch {
      if (previousDay) {
        setLocalPlan((current) =>
          current.map((day) => (day.id === weekday ? previousDay : day)),
        );
      }
      setNotice({
        dayId: weekday,
        tone: "error",
        text: "The training session could not be saved. Please try again.",
      });
    } finally {
      setPendingDayId(null);
    }
  }

  // The week's own Pip: the same ladder every card uses, read from this page's
  // two numbers.
  const weekPip = getPanelPip(
    completedSessionsCount,
    trainingDaysCount,
    "this training week",
    PIP_KITS.fitness,
  );

  return (
    <section className="page-container py-8">
      <header className="mb-7 flex flex-col gap-5 pr-14 md:pr-0 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <Pip
            burn={weekPip.burn}
            className="h-12 w-auto shrink-0 sm:h-16"
            kit={weekPip.kit}
            mood={weekPip.mood}
            seed={16}
            size={64}
            title={weekPip.title}
          />
        <div>
          <p className="label-caps text-primary">
            {view === "today" ? (
              "Fitness"
            ) : (
              <Link className="hover:text-foreground" href="/fitness">
                ← Fitness
              </Link>
            )}
          </p>
          <h1 className="page-title mt-2 text-foreground">
            {view === "week"
              ? "Your training week"
              : view === "guidance"
                ? "How to train it"
                : view === "block"
                  ? "Your programme"
                  : "Today’s training"}
          </h1>
          {/* The week card says "2/5 done" three centimetres below this, and
              saying it twice made the top of the page feel like padding. */}
        </div>
        </div>
        <div className={`flex flex-wrap items-center gap-3 ${view === "week" ? "" : "hidden"}`}>
          <div
            aria-label="Fitness mode"
            className="inline-flex rounded-xl border border-border bg-[var(--wash)] p-1"
            role="group"
          >
            {(["review", "plan"] as const).map((value) => (
              <button
                aria-pressed={mode === value}
                className={`min-h-11 rounded-[calc(var(--radius-md)-4px)] px-4 text-[13px] font-semibold capitalize ${
                  mode === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                key={value}
                onClick={() => {
                  setMode(value);
                  setOpenDayId(null);
                }}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
          {mode === "plan" ? (
          <ConfirmDialog
          confirmLabel="Reset plan"
          description="This restores the default weekly sports and planned times. Completed training sessions stay safely in your history."
          onConfirm={resetFitnessPlanAction}
          onSuccess={() => {
            setLocalPlan((current) =>
              current.map((day) => ({
                ...day,
                sport:
                  day.date >= stats.todayTraining.day.date
                    ? (defaultWeeklyPlan.find((item) => item.id === day.id)
                        ?.sport ?? day.sport)
                    : day.sport,
                templateSport:
                  defaultWeeklyPlan.find((item) => item.id === day.id)?.sport ??
                  day.templateSport,
              })),
            );
            setResetNotice("Plan reset. Session history was preserved.");
          }}
          title="Reset the weekly plan?"
          triggerClassName="rounded-xl border border-[var(--hairline)] bg-muted px-4 py-2.5 text-[13px] font-semibold text-muted-foreground transition hover:border-[var(--hairline)] hover:bg-secondary hover:text-foreground"
          triggerLabel="Reset plan"
          />
          ) : null}
        </div>
      </header>

      {view === "today" ? (
      <section className="flex flex-col gap-4">
        {/* The week, on one line.
            This used to open with a 46px headline and a paragraph, and the one
            thing you actually come here to check — which days are done — was
            three scrolls away in a sidebar. Seven marks answer it before a word
            is read: filled is done, hollow is still owed, a dash is a rest day,
            and the ring is today. */}
        <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="label-caps text-muted-foreground">This week</p>
            <p className="metric-value text-[13px] font-bold">
              {completedSessionsCount}<span className="text-muted-foreground">/{trainingDaysCount} done</span>
            </p>
          </div>

          <ol className="mt-3 grid grid-cols-7 gap-1.5">
            {localPlan.map((day) => {
              const isToday = day.id === todayDay.id;
              const resting = day.sport === "rest";
              const done = day.log.completed;
              return (
                <li key={day.id}>
                  <button
                    aria-label={`${day.label}: ${
                      resting ? "rest day" : done ? "done" : "not done yet"
                    }`}
                    className={`flex w-full flex-col items-center gap-1.5 rounded-xl py-1.5 transition-colors hover:bg-muted ${
                      isToday ? "bg-muted" : ""
                    }`}
                    onClick={() => {
                      setNotice(null);
                      // Set directly as well as via the URL: the URL seeds the
                      // state only on a full load, and a client-side push does
                      // not remount, so without this the week opened with no
                      // day selected.
                      setOpenDayId(day.id);
                      router.push(`/fitness?view=week&day=${day.id}`);
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-7 place-items-center rounded-full text-[12px] font-bold ${
                        done
                          ? "bg-fitness text-white"
                          : resting
                            ? "border border-dashed border-border text-muted-foreground"
                            : "border-2 border-fitness/45 text-fitness-ink"
                      } ${isToday ? "ring-2 ring-fitness ring-offset-2 ring-offset-[var(--card)]" : ""}`}
                    >
                      {done ? "✓" : resting ? "–" : ""}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${
                        isToday ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {day.shortLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="mt-3 border-t border-[var(--hairline)] pt-3 text-[12px] text-muted-foreground">
            {completedDuration} min logged ·{" "}
            {Math.max(0, trainingDaysCount - completedSessionsCount)} left ·{" "}
            {localPlan.filter((day) => day.sport === "rest").length} rest days
          </p>
        </div>

        {/* Today, as one row rather than an essay: what it is, how long, and
            the single control that changes it. */}
        <article
          className={`rounded-2xl p-4 shadow-[var(--shadow-card)] ${
            todayDay.log.completed
              ? "bg-fitness-tint"
              : todayDay.sport === "rest"
                ? "bg-muted"
                : "bg-card"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="label-caps text-fitness-ink">Today · {todayDay.label}</p>
            <StatusBadge day={todayDay} compact />
          </div>

          <h2 className="mt-2 text-[22px] font-bold leading-7 tracking-[-0.02em] text-foreground">
            {todayTraining.title}
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            {todayDay.sport === "rest"
              ? "Recovery day — protect the space."
              : `${todayDay.plannedDurationMinutes} min · ${todayGuidance.headline}`}
          </p>

          {todayDay.sport !== "rest" ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="min-h-11 flex-1 rounded-xl bg-fitness px-5 text-[13px] font-bold text-white transition-colors hover:bg-fitness/90"
                onClick={() => {
                  setNotice(null);
                  setOpenDayId(todayDay.id);
                  router.push(`/fitness?view=week&day=${todayDay.id}`);
                }}
                type="button"
              >
                {todayDay.log.completed ? "Review session" : "Log today\u2019s session"}
              </button>
            </div>
          ) : null}

          {/* The prescription right here, on the screen the day opens on.
              Sending someone two taps away to find out what today contains is
              how a programme stops being followed. */}
          {todayDay.sport === "gym" && sessionLogs[todayDay.id] ? (
            <BlockSessionLog {...sessionLogs[todayDay.id]!} />
          ) : null}
        </article>
      </section>
      ) : null}

      {view === "today" ? <FitnessHub programme={programmeDetail} /> : null}

      {view === "week" ? (
      <section className="mt-8" id="training-calendar">
        <span className="block scroll-mt-6" id="weekly-plan" />
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">Calendar</p>
            <h2 className="mt-2 text-[24px] font-semibold text-foreground">
              {mode === "plan" ? "Edit the reusable plan" : "Review and log this week"}
            </h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-muted-foreground">
              {mode === "plan"
                ? "Sport changes affect future weekly plans. Historical sessions stay unchanged."
                : "Each training day shows the planned duration beside the logged result, with the difference written in minutes."}
            </p>
          </div>
          <div className="hidden items-center gap-4 text-[12px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Done</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--muted-foreground)]" />Rest</span>
          </div>
        </div>

        <div className="rounded-2xl bg-card shadow-[var(--shadow-card)] grid overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {localPlan.map((day) => {
            const isOpen = day.id === openDayId;
            const displayDay =
              mode === "plan"
                ? { ...day, sport: day.templateSport }
                : day;
            return (
              <article className={getDayCardClass(displayDay, isOpen)} key={day.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`label-caps ${getSportTextTone(displayDay.sport)}`}>
                      {day.shortLabel}
                    </p>
                    <h3 className="mt-2 text-[18px] font-semibold text-foreground">
                      {day.label}
                    </h3>
                  </div>
                  <StatusBadge day={displayDay} />
                </div>

                <div className="mt-6 min-h-[48px]">
                  <p className="text-[15px] font-semibold text-foreground">
                    {sportLabels[displayDay.sport]}
                  </p>
                  {displayDay.sport !== "rest" || day.log.completed ? (
                    <>
                      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-[var(--wash)]">
                        <div className="border-r border-border p-2.5">
                          <p className="label-caps text-muted-foreground">Planned</p>
                          <p className="metric-value mt-1 text-[14px] font-semibold text-finance-ink">
                            {day.plannedDurationMinutes} min
                          </p>
                          {day.plannedTime ? (
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {day.plannedTime}
                            </p>
                          ) : null}
                        </div>
                        <div className="p-2.5">
                          <p className="label-caps text-muted-foreground">Logged</p>
                          <p className={`metric-value mt-1 text-[14px] font-semibold ${
                            day.log.completed
                              ? "text-fitness-ink"
                              : "text-muted-foreground"
                          }`}>
                            {day.log.completed ? `${day.log.durationMinutes} min` : "Not yet"}
                          </p>
                          {day.log.completed ? (
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {formatDurationVariance(day)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-[12px] text-muted-foreground">Recovery day</p>
                  )}
                </div>

                {mode === "plan" ? (
                  <select
                    aria-label={`Planned sport for ${day.label}`}
                    className="field-input mt-5"
                    onChange={(event) =>
                      updateSport(day.id, event.target.value as SportType)
                    }
                    value={day.templateSport}
                  >
                    {sportOptions.map((sport) => (
                      <option key={sport} value={sport}>
                        {sportLabels[sport]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    aria-expanded={isOpen}
                    className={`mt-5 flex h-11 w-full items-center justify-between rounded-xl px-3 text-[13px] font-semibold transition ${
                      isOpen
                        ? "bg-primary text-primary-foreground"
                        : "bg-[var(--wash)] text-muted-foreground hover:bg-[var(--hairline)] hover:text-foreground"
                    }`}
                    onClick={() => {
                      setNotice(null);
                      setOpenDayId(isOpen ? null : day.id);
                    }}
                    type="button"
                  >
                    <span>{day.log.completed ? "Review log" : day.sport === "rest" ? "Review day" : "Log session"}</span>
                    <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
      ) : null}

      {view === "week" && openDay ? (
        <article className="rounded-2xl bg-card shadow-[var(--shadow-card)] modal-animate mt-5 rounded-2xl p-5 sm:p-7">
          <div className="flex flex-col gap-4 border-b border-[var(--hairline)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="label-caps text-primary">{openDay.label}</p>
                <StatusBadge day={openDay} compact />
              </div>
              <h2 className="mt-2 text-[26px] font-semibold text-foreground">
                {focusTraining.title}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                {focusTraining.focus}
              </p>
            </div>
            <button
              className="h-11 rounded-xl border border-[var(--hairline)] px-4 text-[13px] font-semibold text-muted-foreground transition hover:bg-[var(--wash)] hover:text-foreground"
              onClick={() => setOpenDayId(null)}
              type="button"
            >
              Close
            </button>
          </div>

          {openDay.sport === "gym" && sessionLogs[openDay.id] ? (
            <BlockSessionLog {...sessionLogs[openDay.id]!} />
          ) : null}

          {openDay.sport !== "rest" || openDay.log.sport ? (
          <form
            action={saveTrainingLog}
            className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.8fr_auto] lg:items-end"
            key={openDay.id}
          >
            <input name="weekday" type="hidden" value={openDay.id} />
            <input
              name="sport"
              type="hidden"
              value={openDay.log.sport ?? openDay.sport}
            />

            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--wash)] px-3">
              <input
                className="h-5 w-5 accent-[var(--primary)]"
                defaultChecked={openDay.log.completed}
                name="completed"
                type="checkbox"
              />
              <span className="text-[13px] font-semibold text-foreground">Training done</span>
            </label>

            <Field label="Time">
              <input className="field-input" defaultValue={openDay.log.time} name="time" type="time" />
            </Field>
            <Field label="Duration">
              <input className="field-input" defaultValue={openDay.log.durationMinutes} max="1440" min="1" name="durationMinutes" required type="number" />
            </Field>
            <Field label="Quality">
              <select className="field-input" defaultValue={openDay.log.quality} name="quality">
                {qualityOptions.map((quality) => (
                  <option key={quality} value={quality}>
                    {qualityLabels[quality]}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="h-11 rounded-xl bg-primary px-6 text-[13px] font-bold text-primary-foreground transition hover:bg-primary disabled:cursor-wait disabled:opacity-60"
              disabled={pendingDayId === openDay.id}
              type="submit"
            >
              {pendingDayId === openDay.id ? "Saving..." : "Save"}
            </button>

            <div className="lg:col-span-5">
              <Field label="Notes">
                <input
                  className="field-input"
                  defaultValue={openDay.log.notes}
                  name="notes"
                  placeholder={sportDescriptions[openDay.sport]}
                />
              </Field>
            </div>
          </form>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-[var(--wash)] p-5">
              <p className="text-[14px] font-semibold text-foreground">Recovery is the plan for this day.</p>
              <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                There is no workout to log. Switch to Plan mode if this day should contain a session instead.
              </p>
            </div>
          )}

        </article>
      ) : null}

      {view === "guidance" ? (
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TrainingInfoCard label="Warm up" value={guidance.warmup} tone="lime" />
        <TrainingInfoCard label="Main work" value={guidance.main} tone="blue" />
        <TrainingInfoCard label="Finish" value={guidance.finish} tone="pink" />
        <TrainingInfoCard label="Recovery" value={guidance.recovery} tone="amber" />
      </section>
      ) : null}

      {view === "block" ? (
        <div className="mt-5">
          <TrainingBlockPanel {...programme} />
        </div>
      ) : null}
      {notice ? (
        <ActionToast message={notice.text} tone={notice.tone} />
      ) : resetNotice ? (
        <ActionToast message={resetNotice} />
      ) : null}
    </section>
  );
}

function formatDurationVariance(day: WeeklyPlanDay) {
  const difference = day.log.durationMinutes - day.plannedDurationMinutes;
  if (difference === 0) return "on plan";
  return `${Math.abs(difference)} min ${difference > 0 ? "over" : "under"} plan`;
}

function getDayCardClass(day: WeeklyPlanDay, open: boolean) {
  const base =
    "relative overflow-hidden border-b border-r border-border p-4 transition before:absolute before:inset-x-0 before:top-0 before:h-[2px] last:border-r-0";

  if (day.log.completed) {
    return `${base} before:bg-primary ${
      open
        ? "bg-[color-mix(in_srgb,var(--primary)_18%,var(--muted))]"
        : "bg-[color-mix(in_srgb,var(--primary)_9%,var(--card))] hover:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))]"
    }`;
  }

  if (day.sport === "rest") {
    return `${base} before:bg-[var(--muted-foreground)] ${
      open
        ? "bg-secondary"
        : "bg-card hover:bg-muted"
    }`;
  }

  const sportAccent: Record<Exclude<SportType, "rest">, string> = {
    cardio: "before:bg-finance",
    gym: "before:bg-primary",
    mobility: "before:bg-[var(--warning)]",
    tennis: "before:bg-tasks",
  };

  return `${base} ${sportAccent[day.sport]} ${
    open
      ? "bg-secondary"
      : "bg-card hover:bg-muted"
  }`;
}

function getSportTextTone(sport: SportType) {
  const tones: Record<SportType, string> = {
    cardio: "text-finance",
    gym: "text-fitness-ink",
    mobility: "text-warning",
    rest: "text-muted-foreground",
    tennis: "text-tasks-ink",
  };
  return tones[sport];
}

function StatusBadge({
  compact = false,
  day,
}: {
  compact?: boolean;
  day: WeeklyPlanDay;
}) {
  const size = compact ? "px-2 py-1 text-[12px]" : "px-2.5 py-1.5 text-[12px]";

  if (day.log.completed) {
    return (
      <span className={`${size} rounded-full bg-primary font-bold text-primary-foreground`}>
        Done
      </span>
    );
  }

  if (day.sport === "rest") {
    return (
      <span className={`${size} rounded-full border border-[var(--hairline)] bg-[var(--wash)] font-bold text-muted-foreground`}>
        Rest
      </span>
    );
  }

  return (
    <span className={`${size} rounded-full border border-[var(--finance)]/25 bg-finance/10 font-bold text-finance-ink`}>
      Planned
    </span>
  );
}


function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="label-caps text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}


function TrainingInfoCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "amber" | "blue" | "lime" | "pink";
  value: string;
}) {
  const tones = {
    amber: "border-[var(--warning)]/25 bg-[var(--warning)]/10 text-warning",
    blue: "border-[var(--finance)]/25 bg-finance/10 text-finance-ink",
    lime: "border-primary/25 bg-primary/10 text-fitness-ink",
    pink: "border-[var(--tasks)]/25 bg-tasks/10 text-tasks-ink",
  };

  return (
    <article className={`rounded-xl border p-5 ${tones[tone]}`}>
      <p className="label-caps opacity-80">{label}</p>
      <p className="mt-3 text-[14px] leading-6 text-foreground">{value}</p>
    </article>
  );
}

const FITNESS_VIEWS = ["today", "week", "guidance", "block"] as const;
type FitnessView = (typeof FITNESS_VIEWS)[number];

function fitnessView(value: string | null): FitnessView {
  return FITNESS_VIEWS.includes(value as FitnessView)
    ? (value as FitnessView)
    : "today";
}

/**
 * The way into everything this page used to show at once.
 *
 * Four full sections stacked on one route is readable on a desktop and is a
 * scroll with no landmarks on a phone — which is what "na mobile nic dokopy
 * nevidis" means. So the page answers today, and the rest are doors.
 */
function FitnessHub({ programme }: { programme: string }) {
  const rows: Array<{ detail: string; href: string; label: string }> = [
    {
      detail: "Change the sport, the time and the length of each day.",
      href: "/fitness?view=week",
      label: "Your training week",
    },
    {
      detail: "Warm up, main work, finish and recovery for today’s session.",
      href: "/fitness?view=guidance",
      label: "How to train it",
    },
    {
      detail: programme,
      href: "/fitness?view=block",
      label: "Your programme",
    },
  ];

  return (
    <nav className="mt-5 flex flex-col gap-2" aria-label="Fitness settings">
      {rows.map((row) => (
        <Link
          className="press-row flex min-h-16 items-center justify-between gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-muted"
          href={row.href}
          key={row.href}
        >
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">{row.label}</span>
            <span className="block text-[12px] leading-4 text-muted-foreground">
              {row.detail}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            →
          </span>
        </Link>
      ))}
    </nav>
  );
}

function isWeekdayId(value: string | null): value is WeekdayId {
  return value !== null && weekdayOrder.includes(value as WeekdayId);
}
