"use client";

import {
  WEEKDAY_PRESETS,
  normaliseRepeatDays,
  orderedWeekdays,
  repeatSentence,
} from "@/lib/routines";

/**
 * The days a task comes back on.
 *
 * Seven chips and three shortcuts, because the answer is nearly always "every
 * day", "weekdays" or "the three days I train". The chips are real checkboxes
 * named `repeatDays`, so the form posts them without any JavaScript of its own.
 */
export function RepeatPicker({
  compact = false,
  onChange,
  value,
}: {
  /** Chips only: for a list of routines, where seven rows of presets is noise. */
  compact?: boolean;
  onChange: (days: number[]) => void;
  value: number[];
}) {
  const toggle = (day: number, on: boolean) =>
    onChange(
      normaliseRepeatDays(
        on ? [...value, day] : value.filter((current) => current !== day),
      ),
    );

  return (
    <>
      {/* Seven across, always: a week that wraps onto two rows stops looking
          like a week. */}
      <div className="grid max-w-[23rem] grid-cols-7 gap-1.5">
        {orderedWeekdays().map((weekday) => {
          const on = value.includes(weekday.index);
          return (
            <label
              className={`grid cursor-pointer select-none place-items-center rounded-xl border text-[12px] font-semibold transition-colors ${
                compact ? "min-h-9" : "min-h-11"
              } ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-secondary text-muted-foreground"
              }`}
              key={weekday.index}
            >
              <input
                checked={on}
                className="sr-only"
                name="repeatDays"
                onChange={(event) => toggle(weekday.index, event.target.checked)}
                type="checkbox"
                value={weekday.index}
              />
              <span aria-hidden>{weekday.initial}</span>
              <span className="sr-only">{weekday.long}</span>
            </label>
          );
        })}
      </div>

      {compact ? null : (
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_PRESETS.map((preset) => (
          <button
            className="min-h-11 rounded-xl border border-border px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            key={preset.id}
            onClick={() => onChange(normaliseRepeatDays(preset.days))}
            type="button"
          >
            {preset.label}
          </button>
        ))}
        {value.length > 0 ? (
          <button
            className="min-h-11 rounded-xl border border-border px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange([])}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>
      )}

      {compact ? null : (
        <span className="text-[12px] leading-4 text-muted-foreground">
          {value.length > 0
            ? `${repeatSentence(value)}, ticked off for each day on its own.`
            : "Leave empty for a one-off task."}
        </span>
      )}
    </>
  );
}
