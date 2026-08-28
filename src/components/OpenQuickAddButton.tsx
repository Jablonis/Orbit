"use client";

export const openQuickAddEvent = "orbit:open-quick-add";

/**
 * Adding should cost one tap from the first screen. The floating button is
 * still there; this is the same thing where the eye already is.
 */
export function OpenQuickAddButton({
  className = "ui-button ui-button--secondary h-11 min-h-11 px-4",
  label = "Add something",
}: {
  className?: string;
  label?: string;
} = {}) {
  return (
    <button
      className={className}
      onClick={() => window.dispatchEvent(new Event(openQuickAddEvent))}
      type="button"
    >
      {label}
    </button>
  );
}
