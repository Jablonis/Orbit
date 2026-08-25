"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  defaultFitnessProfile,
  fitnessEquipment,
  fitnessEquipmentLabels,
  fitnessExperienceLabels,
  fitnessExperiences,
  fitnessGoalLabels,
  fitnessGoals,
  fitnessSessionLengths,
  type FitnessProfile,
} from "@/lib/fitness-setup";
import { weekdayMeta, weekdayOrder } from "@/lib/fitness";
import {
  configureFitnessAction,
  type FitnessSetupActionState,
} from "./actions";

const initialState: FitnessSetupActionState = { message: "", ok: false };

export function FitnessSetupForm({
  compact = false,
  existingPlan = false,
  profile,
}: {
  compact?: boolean;
  existingPlan?: boolean;
  profile?: FitnessProfile | null;
}) {
  const router = useRouter();
  const values = profile ?? defaultFitnessProfile;
  const [state, action, pending] = useActionState(
    configureFitnessAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <form
      action={action}
      aria-busy={pending}
      className={`surface-primary rounded-[var(--radius-panel)] ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-7"
      }`}
    >
      <div className="border-b border-[var(--border-subtle)] pb-5">
        <p className="label-caps text-[var(--accent-primary)]">
          Reviewed starter setup
        </p>
        <h2 className="mt-2 text-[22px] font-semibold text-[var(--text-primary)]">
          {profile
            ? "Edit training setup"
            : existingPlan
              ? "Add setup details"
              : "Build your first weekly plan"}
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[var(--text-secondary)]">
          Starter defaults are preselected for review. Orbit creates a schedule
          only after you confirm these choices; it does not assess injuries or
          provide medical advice.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <label className="grid gap-2">
          <span className="label-caps text-[var(--text-secondary)]">
            Main goal
          </span>
          <select className="field-input" defaultValue={values.goal} name="goal">
            {fitnessGoals.map((goal) => (
              <option key={goal} value={goal}>
                {fitnessGoalLabels[goal]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="label-caps text-[var(--text-secondary)]">
            Experience
          </span>
          <select
            className="field-input"
            defaultValue={values.experience}
            name="experience"
          >
            {fitnessExperiences.map((experience) => (
              <option key={experience} value={experience}>
                {fitnessExperienceLabels[experience]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-3">
          <legend className="label-caps text-[var(--text-secondary)]">
            Available equipment
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {fitnessEquipment.map((equipment) => (
              <Choice
                defaultChecked={values.equipment.includes(equipment)}
                key={equipment}
                label={fitnessEquipmentLabels[equipment]}
                name="equipment"
                value={equipment}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="label-caps text-[var(--text-secondary)]">
            Available days
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {weekdayOrder.map((day) => (
              <Choice
                defaultChecked={values.availableDays.includes(day)}
                key={day}
                label={weekdayMeta[day].shortLabel}
                name="availableDays"
                value={day}
              />
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2">
          <span className="label-caps text-[var(--text-secondary)]">
            Session length
          </span>
          <select
            className="field-input"
            defaultValue={values.sessionLengthMinutes}
            name="sessionLengthMinutes"
          >
            {fitnessSessionLengths.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="label-caps text-[var(--text-secondary)]">
            Exercises to avoid
          </span>
          <textarea
            className="field-input min-h-24 resize-y py-3"
            defaultValue={values.exercisesToAvoid}
            maxLength={1000}
            name="exercisesToAvoid"
            placeholder="Optional: movements you do not want included"
          />
          <span className="text-[12px] leading-5 text-[var(--text-tertiary)]">
            Saved for future exercise selection; it is not an injury assessment.
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-5 text-[var(--text-tertiary)]">
          Saving rebuilds future plan days. Completed session history remains
          unchanged.
        </p>
        <button
          className="min-h-11 shrink-0 rounded-[var(--radius-control)] bg-[var(--text-primary)] px-5 text-[13px] font-bold text-[var(--text-on-light)] disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending
            ? "Building plan…"
            : profile || existingPlan
              ? "Update setup and plan"
              : "Confirm and create plan"}
        </button>
      </div>

      {state.message ? (
        <p
          className={`mt-4 rounded-[var(--radius-control)] border p-3 text-[13px] ${
            state.ok
              ? "border-[color-mix(in_srgb,var(--success)_30%,transparent)] text-[var(--success-text)]"
              : "border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger-text)]"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function Choice({
  defaultChecked,
  label,
  name,
  value,
}: {
  defaultChecked: boolean;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 text-[13px] font-semibold text-[var(--text-secondary)] has-[:checked]:border-[var(--accent-primary)] has-[:checked]:text-[var(--text-primary)]">
      <input
        className="h-4 w-4 accent-[var(--accent-primary)]"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
        value={value}
      />
      {label}
    </label>
  );
}
