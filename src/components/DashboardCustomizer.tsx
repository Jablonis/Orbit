"use client";

import { useActionState, useState } from "react";
import { saveDashboardPreferencesAction } from "@/app/actions";
import { ActionToast } from "@/components/ActionToast";
import {
  type DashboardCardId,
  type DashboardPreferences,
  dashboardCardLabels,
  defaultDashboardPreferences,
} from "@/lib/preferences";

const initialState = { message: "", ok: false };

export function DashboardCustomizer({
  categories,
  preferences,
}: {
  categories: string[];
  preferences: DashboardPreferences;
}) {
  const [order, setOrder] = useState(preferences.cardOrder);
  const [hidden, setHidden] = useState(preferences.hiddenCards);
  const [density, setDensity] = useState(preferences.density);
  const [rangeDays, setRangeDays] = useState(preferences.rangeDays);
  const [pinnedTaskCategory, setPinnedTaskCategory] = useState(
    preferences.pinnedTaskCategory,
  );
  const [pinnedFinanceMetric, setPinnedFinanceMetric] = useState(
    preferences.pinnedFinanceMetric,
  );
  const [focusTarget, setFocusTarget] = useState(
    String(preferences.scoring.focusTargetMinutes),
  );
  const [tasksWeight, setTasksWeight] = useState(
    String(preferences.scoring.weights.tasks),
  );
  const [fitnessWeight, setFitnessWeight] = useState(
    String(preferences.scoring.weights.fitness),
  );
  const [focusWeight, setFocusWeight] = useState(
    String(preferences.scoring.weights.focus),
  );
  const [regional, setRegional] = useState(preferences.regional);
  const [state, action, pending] = useActionState(
    saveDashboardPreferencesAction,
    initialState,
  );
  const hasUnsavedChanges =
    order.join("|") !== preferences.cardOrder.join("|") ||
    [...hidden].sort().join("|") !== [...preferences.hiddenCards].sort().join("|") ||
    density !== preferences.density ||
    rangeDays !== preferences.rangeDays ||
    pinnedTaskCategory !== preferences.pinnedTaskCategory ||
    pinnedFinanceMetric !== preferences.pinnedFinanceMetric ||
    focusTarget !== String(preferences.scoring.focusTargetMinutes) ||
    tasksWeight !== String(preferences.scoring.weights.tasks) ||
    fitnessWeight !== String(preferences.scoring.weights.fitness) ||
    focusWeight !== String(preferences.scoring.weights.focus) ||
    JSON.stringify(regional) !== JSON.stringify(preferences.regional);

  function move(card: DashboardCardId, direction: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(card);
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function toggle(card: DashboardCardId) {
    setHidden((current) =>
      current.includes(card)
        ? current.filter((item) => item !== card)
        : [...current, card],
    );
  }

  function showDefaults() {
    setOrder([...defaultDashboardPreferences.cardOrder]);
    setHidden([]);
    setDensity(defaultDashboardPreferences.density);
    setRangeDays(defaultDashboardPreferences.rangeDays);
    setPinnedTaskCategory(defaultDashboardPreferences.pinnedTaskCategory);
    setPinnedFinanceMetric(defaultDashboardPreferences.pinnedFinanceMetric);
    setFocusTarget(
      String(defaultDashboardPreferences.scoring.focusTargetMinutes),
    );
    setTasksWeight(
      String(defaultDashboardPreferences.scoring.weights.tasks),
    );
    setFitnessWeight(
      String(defaultDashboardPreferences.scoring.weights.fitness),
    );
    setFocusWeight(
      String(defaultDashboardPreferences.scoring.weights.focus),
    );
    setRegional(defaultDashboardPreferences.regional);
  }

  return (
    <>
      <form
        action={action}
        aria-busy={pending}
        className="content-panel rounded-[var(--radius-row)] p-4 sm:p-5"
      >
        <p className="mb-4 text-[13px] leading-5 text-[var(--text-secondary)]">
          Choose what appears in Today and Trends. Ordering stays within those two
          sections so the dashboard remains easy to scan.
        </p>
        {order.map((card) => (
          <input key={card} name="cardOrder" type="hidden" value={card} />
        ))}
        {hidden.map((card) => (
          <input key={card} name="hiddenCards" type="hidden" value={card} />
        ))}
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="label-caps text-[var(--text-secondary)]">Cards</p>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-tertiary)]">
              {hidden.length
                ? `Hidden preview: ${hidden.map((card) => dashboardCardLabels[card]).join(", ")}.`
                : "All dashboard cards are currently visible."}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {order.map((card, index) => {
                const visible = !hidden.includes(card);
                return (
                  <div
                    className="flex items-center gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-white/[0.025] p-2"
                    key={card}
                  >
                    <button
                      aria-label={`${visible ? "Hide" : "Show"} ${dashboardCardLabels[card]}`}
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[12px] font-bold ${
                        visible
                          ? "bg-[var(--accent-primary)] text-[var(--surface-nav)]"
                          : "bg-white/5 text-[var(--text-tertiary)]"
                      }`}
                      onClick={() => toggle(card)}
                      type="button"
                    >
                      {visible ? "✓" : "—"}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">
                      {dashboardCardLabels[card]}
                    </span>
                    <div className="flex">
                      <button
                        aria-label={`Move ${dashboardCardLabels[card]} up`}
                        className="grid h-11 w-11 place-items-center rounded-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-25"
                        disabled={index === 0}
                        onClick={() => move(card, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Move ${dashboardCardLabels[card]} down`}
                        className="grid h-11 w-11 place-items-center rounded-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-25"
                        disabled={index === order.length - 1}
                        onClick={() => move(card, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PreferenceField label="Density">
              <select
                className="field-input"
                name="density"
                onChange={(event) =>
                  setDensity(event.target.value as DashboardPreferences["density"])
                }
                value={density}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </PreferenceField>
            <PreferenceField label="Analytics range">
              <select
                className="field-input"
                name="rangeDays"
                onChange={(event) =>
                  setRangeDays(event.target.value === "30" ? 30 : 7)
                }
                value={String(rangeDays)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </PreferenceField>
            <PreferenceField label="Pinned task category">
              <select
                className="field-input"
                name="pinnedTaskCategory"
                onChange={(event) => setPinnedTaskCategory(event.target.value)}
                value={pinnedTaskCategory}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </PreferenceField>
            <PreferenceField label="Pinned finance metric">
              <select
                className="field-input"
                name="pinnedFinanceMetric"
                onChange={(event) =>
                  setPinnedFinanceMetric(
                    event.target.value as DashboardPreferences["pinnedFinanceMetric"],
                  )
                }
                value={pinnedFinanceMetric}
              >
                <option value="balance">Imported net cashflow</option>
                <option value="income">Income</option>
                <option value="expenses">Expenses</option>
                <option value="net">Net cashflow</option>
              </select>
            </PreferenceField>
          </div>
        </div>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
          <p className="label-caps text-[var(--accent-info)]">
            Profile and regional
          </p>
          <p className="mt-2 max-w-3xl text-[12px] leading-5 text-[var(--text-secondary)]">
            These settings control your profile identity, date formatting,
            currency, week boundaries, and the timezone Orbit uses for today.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <PreferenceField label="Display name">
              <input
                autoComplete="name"
                className="field-input"
                maxLength={80}
                name="displayName"
                onChange={(event) =>
                  setRegional((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="Your name"
                value={regional.displayName}
              />
            </PreferenceField>
            <PreferenceField label="Initials">
              <input
                className="field-input uppercase"
                maxLength={3}
                name="initials"
                onChange={(event) =>
                  setRegional((current) => ({ ...current, initials: event.target.value }))
                }
                placeholder="OP"
                value={regional.initials}
              />
            </PreferenceField>
            <PreferenceField label="Timezone">
              <select
                className="field-input"
                name="timeZone"
                onChange={(event) =>
                  setRegional((current) => ({
                    ...current,
                    timeZone: event.target.value as DashboardPreferences["regional"]["timeZone"],
                  }))
                }
                value={regional.timeZone}
              >
                <option value="Europe/Bratislava">Europe / Bratislava</option>
                <option value="Europe/London">Europe / London</option>
                <option value="America/New_York">America / New York</option>
                <option value="America/Los_Angeles">America / Los Angeles</option>
                <option value="UTC">UTC</option>
              </select>
            </PreferenceField>
            <PreferenceField label="Language and dates">
              <select
                className="field-input"
                name="locale"
                onChange={(event) =>
                  setRegional((current) => ({
                    ...current,
                    locale: event.target.value as DashboardPreferences["regional"]["locale"],
                  }))
                }
                value={regional.locale}
              >
                <option value="en-IE">English (Ireland)</option>
                <option value="en-GB">English (United Kingdom)</option>
                <option value="en-US">English (United States)</option>
                <option value="sk-SK">Slovenčina</option>
              </select>
            </PreferenceField>
            <PreferenceField label="Currency">
              <select
                className="field-input"
                name="currency"
                onChange={(event) =>
                  setRegional((current) => ({
                    ...current,
                    currency: event.target.value as DashboardPreferences["regional"]["currency"],
                  }))
                }
                value={regional.currency}
              >
                <option value="EUR">EUR · Euro</option>
                <option value="USD">USD · US dollar</option>
                <option value="GBP">GBP · Pound sterling</option>
                <option value="CZK">CZK · Czech koruna</option>
              </select>
            </PreferenceField>
            <PreferenceField label="Week starts on">
              <select
                className="field-input"
                name="weekStartsOn"
                onChange={(event) =>
                  setRegional((current) => ({
                    ...current,
                    weekStartsOn: event.target.value as DashboardPreferences["regional"]["weekStartsOn"],
                  }))
                }
                value={regional.weekStartsOn}
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </PreferenceField>
          </div>
        </div>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
          <p className="label-caps text-[var(--accent-highlight)]">
            Productivity goal
          </p>
          <p className="mt-2 max-w-3xl text-[12px] leading-5 text-[var(--text-secondary)]">
            Set the focus target and relative weight of each domain. A rest day
            or a day without planned tasks is treated as missing data, not poor
            performance. Domains you turn off in the chart are normalized out.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PreferenceField label="Daily focus target">
              <div className="relative">
                <input
                  className="field-input pr-16"
                  inputMode="numeric"
                  max="480"
                  min="15"
                  name="focusTargetMinutes"
                  onChange={(event) => setFocusTarget(event.target.value)}
                  type="number"
                  value={focusTarget}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text-tertiary)]">
                  min
                </span>
              </div>
            </PreferenceField>
            <WeightField
              value={tasksWeight}
              label="Tasks weight"
              name="tasksWeight"
              onChange={setTasksWeight}
            />
            <WeightField
              value={fitnessWeight}
              label="Fitness weight"
              name="fitnessWeight"
              onChange={setFitnessWeight}
            />
            <WeightField
              value={focusWeight}
              label="Focus weight"
              name="focusWeight"
              onChange={setFocusWeight}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
          <p
            aria-live="polite"
            className={`w-full text-[12px] font-semibold sm:w-auto ${
              pending
                ? "text-[var(--info-text)]"
                : hasUnsavedChanges
                  ? "text-[var(--warning-text)]"
                  : "text-[var(--success-text)]"
            }`}
          >
            {pending
              ? "Saving your changes…"
              : hasUnsavedChanges
                ? "Unsaved changes — review the order, then save."
                : "All settings are saved."}
          </p>
          <button
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-white disabled:opacity-55"
            disabled={pending}
            name="intent"
            onClick={showDefaults}
            type="submit"
            value="reset"
          >
            Reset defaults
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-white px-5 py-2.5 text-[13px] font-bold text-[var(--text-on-light)] disabled:opacity-55"
            disabled={pending || !hasUnsavedChanges}
            type="submit"
          >
            {pending ? (
              <span
                aria-hidden="true"
                className="action-toast-spinner h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent"
              />
            ) : null}
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
      {pending ? (
        <ActionToast message="Saving Orbit settings…" tone="loading" />
      ) : state.message && (!state.ok || !hasUnsavedChanges) ? (
        <ActionToast message={state.message} tone={state.ok ? "success" : "error"} />
      ) : null}
    </>
  );
}

function WeightField({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <PreferenceField label={label}>
      <div className="relative">
        <input
          className="field-input pr-10"
          inputMode="numeric"
          max="100"
          min="0"
          name={name}
          onChange={(event) => onChange(event.target.value)}
          type="number"
          value={value}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--text-tertiary)]">
          %
        </span>
      </div>
    </PreferenceField>
  );
}

function PreferenceField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="label-caps text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
