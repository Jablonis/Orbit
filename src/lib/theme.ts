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

/**
 * Which palette, which is a different question from light or dark.
 *
 * Orbit is the one the app has always had: a plum accent and a tint per
 * system, so the colour tells you which half of the app you are in. Instrument
 * is the one `docs/UI_SYSTEM.md` has described all along and the code never
 * got — warm bone type on a warm near-black, one lime action colour, and the
 * domain tints turned right down so a screen reads as a document rather than
 * as three coloured blocks.
 *
 * Both answer light and dark, because this is a second axis rather than a
 * replacement. Nothing is thrown away: Orbit stays the default, and a palette
 * nobody chose is a palette nobody has to notice.
 */
export const PALETTE_COOKIE = "orbit-palette";
export const paletteChoices = ["orbit", "instrument"] as const;
export type PaletteChoice = (typeof paletteChoices)[number];

export function parsePalette(value: string | undefined | null): PaletteChoice {
  return paletteChoices.includes(value as PaletteChoice)
    ? (value as PaletteChoice)
    : "orbit";
}

/** The default carries no stamp, the same way "system" carries no theme. */
export function paletteAttribute(choice: PaletteChoice) {
  return choice === "orbit" ? undefined : choice;
}
