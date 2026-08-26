"use client";

export const openQuickAddEvent = "orbit:open-quick-add";

/**
 * Adding should cost one tap from the first screen. The floating button is
 * still there; this is the same thing where the eye already is.
 */
export function OpenQuickAddButton() {
  return (
    <button
      className="ui-button ui-button--secondary h-11 min-h-11 px-4"
      onClick={() => window.dispatchEvent(new Event(openQuickAddEvent))}
      type="button"
    >
      Add something
    </button>
  );
}
