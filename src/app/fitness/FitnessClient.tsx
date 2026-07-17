"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { ActionToast } from "@/components/ActionToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  stats,
  weeklyPlan,
}: {
  stats: {
    completedSessionsCount: number;
    gymDaysCount: number;
    restDaysCount: number;
    todayTraining: TodayTraining;
  };
  weeklyPlan: WeeklyPlanDay[];
}) {
  const [localPlan, setLocalPlan] = useState(weeklyPlan);
  const [openDayId, setOpenDayId] = useState<WeekdayId | null>(null);
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
  const focusTraining = getTrainingForDay(localPlan, focusDay.id);
  const guidance = getTrainingGuidance(focusDay.sport, focusTraining.title);
  const todayGuidance = getTrainingGuidance(todayDay.sport, todayTraining.title);
  const trainingDaysCount = localPlan.filter((day) => day.sport !== "rest").length;
  const completedSessionsCount = localPlan.filter(
    (day) => day.sport !== "rest" && day.log.completed,
  ).length;
  const completionPercent = trainingDaysCount
    ? Math.round((completedSessionsCount / trainingDaysCount) * 100)
    : 0;

  function updateSport(dayId: WeekdayId, sport: SportType) {
    const previousDay = localPlan.find((day) => day.id === dayId);
    setNotice(null);
    setLocalPlan((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              sport,
              log:
                sport === "rest" ? { ...day.log, completed: false } : day.log,
            }
          : day,
      ),
    );

    const formData = new FormData();
    formData.set("weekday", dayId);
    formData.set("sport", sport);

    startTransition(async () => {
      const result = await updateFitnessDayAction(formData);
      if (!result.ok && previousDay) {
        setLocalPlan((current) =>
          current.map((day) => (day.id === dayId ? previousDay : day)),
        );
        setNotice({ dayId, tone: "error", text: result.error });
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
              log: { completed, durationMinutes, notes, quality, time },
            }
          : day,
      ),
    );

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
    setPendingDayId(null);
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-10">
      <header className="mb-7 flex flex-col gap-5 pr-14 md:pr-0 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label-caps text-[#a3e635]">Fitness plan</p>
          <h1 className="page-title mt-2 text-white">
            Today&apos;s training
          </h1>
          <p className="mt-3 text-[14px] text-[#9ea3a5]">
            {completedSessionsCount} of {trainingDaysCount} planned sessions complete
          </p>
        </div>
        <ConfirmDialog
          confirmLabel="Reset plan"
          description="This restores the default weekly sports and planned times. Completed training sessions stay safely in your history."
          onConfirm={resetFitnessPlanAction}
          onSuccess={() => {
            setLocalPlan((current) =>
              current.map((day, index) => ({
                ...day,
                sport: defaultWeeklyPlan[index].sport,
              })),
            );
            setResetNotice("Plan reset. Session history was preserved.");
          }}
          title="Reset the weekly plan?"
          triggerClassName="rounded-[12px] border border-white/10 bg-[#201f1f] px-4 py-2.5 text-[13px] font-semibold text-[#c4c7c8] transition hover:border-white/20 hover:bg-[#2a2929] hover:text-white"
          triggerLabel="Reset plan"
        />
      </header>

      <section className="grid gap-5 xl:grid-cols-12">
        <article className={`content-panel relative overflow-hidden rounded-[var(--radius-panel)] p-6 sm:p-8 xl:col-span-8 ${todayDay.log.completed ? "completion-celebrate" : ""}`}>
          <div className="absolute inset-y-0 left-0 w-1 bg-[#a3e635]" />
          <div className="grid gap-7 md:grid-cols-[1.35fr_1fr] md:items-end">
            <div>
              <div className="flex items-center gap-3">
                <p className="label-caps text-[#d9f99d]">Today · {todayDay.label}</p>
                <StatusBadge day={todayDay} compact />
              </div>
              <h2 className="mt-5 text-[36px] font-semibold leading-[42px] text-white sm:text-[46px] sm:leading-[52px]">
                {todayTraining.title}
              </h2>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#c4c7c8]">
                {todayTraining.focus}
              </p>
              <p className="mt-2 text-[13px] font-semibold text-[var(--accent-primary)]">
                {todayDay.sport === "rest"
                  ? "Recovery day — protect the space."
                  : todayDay.log.completed
                    ? "Workout logged — today’s training is complete."
                    : `${todayDay.log.durationMinutes} minutes planned today.`}
              </p>
              {todayDay.sport !== "rest" ? (
                <button
                  className="mt-5 min-h-11 rounded-[var(--radius-control)] bg-[var(--accent-primary)] px-5 text-[13px] font-bold text-[#14200a]"
                  onClick={() => setOpenDayId(todayDay.id)}
                  type="button"
                >
                  {todayDay.log.completed ? "Review session" : "Log today’s session"}
                </button>
              ) : (
                <button
                  className="mt-5 min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-white/[0.04] px-5 text-[13px] font-semibold text-white"
                  onClick={() => document.getElementById("weekly-plan")?.scrollIntoView({ behavior: "smooth" })}
                  type="button"
                >
                  Plan the week
                </button>
              )}
            </div>
            <div className="border-t border-white/10 pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0">
              <p className="label-caps text-[#ff82bc]">Main focus</p>
              <p className="mt-3 text-[18px] font-semibold leading-6 text-white">
                {todayGuidance.headline}
              </p>
              <p className="mt-2 text-[13px] leading-5 text-[#9ea3a5]">
                {todayGuidance.intent}
              </p>
            </div>
          </div>
        </article>

        <aside className="content-panel rounded-[var(--radius-panel)] p-6 sm:p-8 xl:col-span-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="label-caps text-[#60a5fa]">Week progress</p>
              <p className="metric-value mt-3 text-[26px] font-semibold text-white">
                {completedSessionsCount} sessions done
              </p>
              <p className="mt-2 text-[13px] text-[#9ea3a5]">
                {trainingDaysCount - completedSessionsCount} remaining · {localPlan.filter((day) => day.sport === "rest").length} rest days
              </p>
            </div>
            <ProgressRing value={completionPercent} />
          </div>
          <div className="mt-7 grid grid-cols-3 border-t border-white/10 pt-5">
            <Metric label="Gym" value={localPlan.filter((day) => day.sport === "gym").length} tone="text-[#a3e635]" />
            <Metric label="Rest" value={localPlan.filter((day) => day.sport === "rest").length} tone="text-[#94a3b8]" />
            <Metric label="Done" value={completedSessionsCount} tone="text-[#60a5fa]" />
          </div>
        </aside>
      </section>

      <section className="mt-8" id="training-calendar">
        <span className="block scroll-mt-6" id="weekly-plan" />
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="label-caps text-[#9ea3a5]">Calendar</p>
            <h2 className="mt-2 text-[24px] font-semibold text-white">Your week</h2>
          </div>
          <div className="hidden items-center gap-4 text-[12px] text-[#9ea3a5] sm:flex">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#a3e635]" />Done</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#60a5fa]" />Planned</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#7d838a]" />Rest</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {localPlan.map((day) => {
            const isOpen = day.id === openDayId;
            return (
              <article className={getDayCardClass(day, isOpen)} key={day.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`label-caps ${getSportTextTone(day.sport)}`}>
                      {day.shortLabel}
                    </p>
                    <h3 className="mt-2 text-[18px] font-semibold text-white">
                      {day.label}
                    </h3>
                  </div>
                  <StatusBadge day={day} />
                </div>

                <div className="mt-6 min-h-[48px]">
                  <p className="text-[15px] font-semibold text-white">
                    {sportLabels[day.sport]}
                  </p>
                  <p className="mt-1 text-[12px] text-[#8f9496]">
                    {day.sport === "rest"
                      ? "Recovery"
                      : day.log.time || `${day.log.durationMinutes} min planned`}
                  </p>
                </div>

                <select
                  aria-label={`Sport for ${day.label}`}
                  className="field-input mt-5"
                  onChange={(event) =>
                    updateSport(day.id, event.target.value as SportType)
                  }
                  value={day.sport}
                >
                  {sportOptions.map((sport) => (
                    <option key={sport} value={sport}>
                      {sportLabels[sport]}
                    </option>
                  ))}
                </select>

                <button
                  aria-expanded={isOpen}
                  className={`mt-3 flex h-10 w-full items-center justify-between rounded-[10px] px-3 text-[13px] font-semibold transition ${
                    isOpen
                      ? "bg-white text-[#171718]"
                      : "bg-white/[0.06] text-[#d6d8d9] hover:bg-white/[0.1] hover:text-white"
                  }`}
                  onClick={() => {
                    setNotice(null);
                    setOpenDayId(isOpen ? null : day.id);
                  }}
                  type="button"
                >
                  <span>More</span>
                  <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {openDay ? (
        <article className="content-panel modal-animate mt-5 rounded-[var(--radius-panel)] p-5 sm:p-7">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="label-caps text-[#a3e635]">{openDay.label}</p>
                <StatusBadge day={openDay} compact />
              </div>
              <h2 className="mt-2 text-[26px] font-semibold text-white">
                {focusTraining.title}
              </h2>
              <p className="mt-2 text-[13px] leading-5 text-[#9ea3a5]">
                {focusTraining.focus}
              </p>
            </div>
            <button
              className="h-10 rounded-[10px] border border-white/10 px-4 text-[13px] font-semibold text-[#c4c7c8] transition hover:bg-white/[0.06] hover:text-white"
              onClick={() => setOpenDayId(null)}
              type="button"
            >
              Close
            </button>
          </div>

          <form
            action={saveTrainingLog}
            className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.8fr_auto] lg:items-end"
            key={openDay.id}
          >
            <input name="weekday" type="hidden" value={openDay.id} />
            <input name="sport" type="hidden" value={openDay.sport} />

            {openDay.sport !== "rest" ? (
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-3">
                <input
                  className="h-5 w-5 accent-[#a3e635]"
                  defaultChecked={openDay.log.completed}
                  name="completed"
                  type="checkbox"
                />
                <span className="text-[13px] font-semibold text-white">Training done</span>
              </label>
            ) : (
              <div className="flex h-11 items-center rounded-[12px] border border-white/10 bg-white/[0.03] px-3 text-[13px] font-semibold text-[#aeb3b5]">
                Recovery day
              </div>
            )}

            <Field label="Time">
              <input className="field-input" defaultValue={openDay.log.time} name="time" placeholder="18:30" />
            </Field>
            <Field label="Duration">
              <input className="field-input" defaultValue={openDay.log.durationMinutes} min="0" name="durationMinutes" type="number" />
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
              className="h-11 rounded-[12px] bg-[#a3e635] px-6 text-[13px] font-bold text-[#14200a] transition hover:bg-[#b7ef58] disabled:cursor-wait disabled:opacity-60"
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

        </article>
      ) : null}

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TrainingInfoCard label="Warm up" value={guidance.warmup} tone="lime" />
        <TrainingInfoCard label="Main work" value={guidance.main} tone="blue" />
        <TrainingInfoCard label="Finish" value={guidance.finish} tone="pink" />
        <TrainingInfoCard label="Recovery" value={guidance.recovery} tone="amber" />
      </section>
      {notice ? (
        <ActionToast message={notice.text} tone={notice.tone} />
      ) : resetNotice ? (
        <ActionToast message={resetNotice} />
      ) : null}
    </section>
  );
}

function getDayCardClass(day: WeeklyPlanDay, open: boolean) {
  const base =
    "relative overflow-hidden rounded-[18px] border p-4 transition before:absolute before:inset-x-0 before:top-0 before:h-1";

  if (day.sport === "rest") {
    return `${base} before:bg-[#7d838a] ${
      open
        ? "border-[#aeb3b5]/45 bg-[#252728]"
        : "border-white/10 bg-[#191a1b] hover:border-white/20"
    }`;
  }

  if (day.log.completed) {
    return `${base} before:bg-[#a3e635] ${
      open
        ? "border-[#a3e635]/70 bg-[#1b3117] shadow-[0_18px_44px_-24px_rgba(163,230,53,0.65)]"
        : "border-[#a3e635]/35 bg-[#152614] hover:border-[#a3e635]/60"
    }`;
  }

  const sportAccent: Record<Exclude<SportType, "rest">, string> = {
    cardio: "before:bg-[#60a5fa]",
    gym: "before:bg-[#a3e635]",
    mobility: "before:bg-[#f59e0b]",
    tennis: "before:bg-[#ff4fa3]",
  };

  return `${base} ${sportAccent[day.sport]} ${
    open
      ? "border-white/30 bg-[#252424] shadow-[0_18px_44px_-28px_rgba(255,255,255,0.35)]"
      : "border-white/10 bg-[#1b1a1a] hover:-translate-y-0.5 hover:border-white/20"
  }`;
}

function getSportTextTone(sport: SportType) {
  const tones: Record<SportType, string> = {
    cardio: "text-[#93c5fd]",
    gym: "text-[#d9f99d]",
    mobility: "text-[#fcd34d]",
    rest: "text-[#aeb3b5]",
    tennis: "text-[#ff9ac9]",
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
  const size = compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]";

  if (day.sport === "rest") {
    return (
      <span className={`${size} rounded-full border border-white/10 bg-white/[0.06] font-bold text-[#c6cacc]`}>
        Rest
      </span>
    );
  }

  if (day.log.completed) {
    return (
      <span className={`${size} rounded-full bg-[#a3e635] font-bold text-[#14200a]`}>
        Done
      </span>
    );
  }

  return (
    <span className={`${size} rounded-full border border-[#60a5fa]/25 bg-[#60a5fa]/10 font-bold text-[#bfdbfe]`}>
      Planned
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const circumference = 251.2;
  const offset = circumference - (circumference * value) / 100;

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg aria-label={`${value}% complete`} className="h-full w-full -rotate-90" role="img" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="none" r="40" stroke="#303234" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          fill="none"
          r="40"
          stroke="#a3e635"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="9"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[20px] font-semibold text-white">
        {value}%
      </span>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2">
      <span className="label-caps text-[#9ea3a5]">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, tone, value }: { label: string; tone: string; value: number }) {
  return (
    <div className="border-r border-white/10 px-3 last:border-r-0 first:pl-0 last:pr-0">
      <p className="label-caps text-[#858b8e]">{label}</p>
      <p className={`mt-2 text-[26px] font-semibold ${tone}`}>{value}</p>
    </div>
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
    amber: "border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#fde68a]",
    blue: "border-[#60a5fa]/25 bg-[#60a5fa]/10 text-[#bfdbfe]",
    lime: "border-[#a3e635]/25 bg-[#a3e635]/10 text-[#d9f99d]",
    pink: "border-[#ff4fa3]/25 bg-[#ff4fa3]/10 text-[#ffd1e5]",
  };

  return (
    <article className={`rounded-[18px] border p-5 ${tones[tone]}`}>
      <p className="label-caps opacity-80">{label}</p>
      <p className="mt-3 text-[14px] leading-6 text-white">{value}</p>
    </article>
  );
}

function getTrainingGuidance(sport: SportType, title: string) {
  if (sport === "tennis") {
    return {
      finish: "10 min serve targets, then 5 min easy shoulder mobility.",
      headline: "Tennis skill and movement",
      intent: "Prioritize footwork, clean contact and repeatable serve mechanics.",
      main: "3 blocks: cross-court rally, approach shots, serve plus first ball.",
      recovery: "Forearm, calves and hips. Keep the next gym day fresh.",
      warmup: "8 min dynamic hips, ankles, shoulder circles and short court sprints.",
    };
  }

  if (sport === "cardio") {
    return {
      finish: "5 min cooldown walk and nasal breathing.",
      headline: "Conditioning base",
      intent: "Build engine without crushing recovery for strength work.",
      main: "30-45 min zone 2, or 8 x 60 sec faster efforts with easy recovery.",
      recovery: "Hydrate, stretch calves lightly and keep evening intensity low.",
      warmup: "Start easy for 8-10 min before raising pace.",
    };
  }

  if (sport === "mobility") {
    return {
      finish: "2 min slow breathing in a deep squat or child pose.",
      headline: "Mobility and control",
      intent: "Open the positions you need for lifting, running and tennis.",
      main: "Hips, thoracic rotation, hamstrings, ankles and shoulder control.",
      recovery: "Keep it smooth. No aggressive stretching today.",
      warmup: "5 min easy movement flow from neck to ankles.",
    };
  }

  if (sport === "rest") {
    return {
      finish: "10 min walk after dinner if you feel stiff.",
      headline: "Recovery day",
      intent: "Absorb the week. Do less, but do it deliberately.",
      main: "Sleep, steps, hydration and light tissue work only.",
      recovery: "Prepare tomorrow's session and keep caffeine earlier.",
      warmup: "No workout warmup needed. Move gently.",
    };
  }

  return {
    finish: "Core finisher: carries, plank or dead bug for 6-8 min.",
    headline: `${title} gym session`,
    intent: "Hit the planned split with clean reps and leave one rep in reserve.",
    main: "Main lift, secondary compound, 2 accessories, then trunk stability.",
    recovery: "Protein meal, light walk and no extra max-effort sets.",
    warmup: "5 min pulse raiser, mobility for today’s joints, then ramp-up sets.",
  };
}
