"use client";

export const openOrbitSettingsEvent = "orbit:open-settings";

export function OpenDashboardSettingsButton() {
  return (
    <button
      className="min-h-11 rounded-xl border border-input bg-[var(--wash)] px-4 text-[13px] font-semibold text-foreground transition hover:bg-[var(--wash)]"
      onClick={() => window.dispatchEvent(new Event(openOrbitSettingsEvent))}
      type="button"
    >
      Customize overview
    </button>
  );
}
