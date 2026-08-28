/**
 * Light, dark, or whatever the phone is doing.
 *
 * The choice lives in a cookie rather than in local storage, because the server
 * renders the document: it stamps `data-theme` before the page is sent, so the
 * first paint is already the right colour. The local-storage version of this
 * needs an inline script to run before paint, and an inline script in this app
 * needs a CSP nonce — a lot of machinery to avoid one white flash.
 *
 * "System" is the absence of a stamp: the stylesheet answers
 * `prefers-color-scheme` on its own.
 */

export const THEME_COOKIE = "orbit-theme";
export const themeChoices = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof themeChoices)[number];

export function parseTheme(value: string | undefined | null): ThemeChoice {
  return themeChoices.includes(value as ThemeChoice)
    ? (value as ThemeChoice)
    : "system";
}

/** What goes on the html element. System is nothing at all. */
export function themeAttribute(choice: ThemeChoice) {
  return choice === "system" ? undefined : choice;
}

/** A year: long enough to be a preference, short enough to expire eventually. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
