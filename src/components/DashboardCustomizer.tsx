"use client";

import { useActionState, useState } from "react";
import { saveDashboardPreferencesAction } from "@/app/actions";
import {
  type DashboardCardId,
  type DashboardPreferences,
  dashboardCardLabels,
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
  const [state, action, pending] = useActionState(
    saveDashboardPreferencesAction,
    initialState,
  );

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

  return (
    <details className="glass-panel relative z-20 mb-5 rounded-[20px]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[13px] font-semibold text-white sm:px-5">
        Customize overview
        <span className="text-[11px] text-[#a3e635]">Layout · density · defaults</span>
      </summary>
      <form action={action} className="border-t border-white/10 p-4 sm:p-5">
        {order.map((card) => (
          <input key={card} name="cardOrder" type="hidden" value={card} />
        ))}
        {hidden.map((card) => (
          <input key={card} name="hiddenCards" type="hidden" value={card} />
        ))}
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="label-caps text-[#c4c7c8]">Cards</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {order.map((card, index) => {
                const visible = !hidden.includes(card);
                return (
                  <div
                    className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.035] p-2"
                    key={card}
                  >
                    <button
                      aria-label={`${visible ? "Hide" : "Show"} ${dashboardCardLabels[card]}`}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[12px] font-bold ${
                        visible
                          ? "bg-[#a3e635] text-[#111112]"
                          : "bg-white/5 text-[#8d9092]"
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
                        className="grid h-8 w-7 place-items-center text-[#c4c7c8] disabled:opacity-25"
                        disabled={index === 0}
                        onClick={() => move(card, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Move ${dashboardCardLabels[card]} down`}
                        className="grid h-8 w-7 place-items-center text-[#c4c7c8] disabled:opacity-25"
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
                defaultValue={preferences.density}
                name="density"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </PreferenceField>
            <PreferenceField label="Analytics range">
              <select
                className="field-input"
                defaultValue={String(preferences.rangeDays)}
                name="rangeDays"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </PreferenceField>
            <PreferenceField label="Pinned task category">
              <select
                className="field-input"
                defaultValue={preferences.pinnedTaskCategory}
                name="pinnedTaskCategory"
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
                defaultValue={preferences.pinnedFinanceMetric}
                name="pinnedFinanceMetric"
              >
                <option value="balance">Available balance</option>
                <option value="income">Income</option>
                <option value="expenses">Expenses</option>
                <option value="net">Net cashflow</option>
              </select>
            </PreferenceField>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p aria-live="polite" className={`text-[12px] ${state.ok ? "text-[#a3e635]" : "text-[#ffb4ab]"}`}>
            {state.message}
          </p>
          <button
            className="rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#202020] disabled:opacity-55"
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving…" : "Save overview"}
          </button>
        </div>
      </form>
    </details>
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
      <span className="label-caps text-[#c4c7c8]">{label}</span>
      {children}
    </label>
  );
}
