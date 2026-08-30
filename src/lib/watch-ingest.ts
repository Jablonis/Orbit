/**
 * What a phone sends, translated into what Orbit stores.
 *
 * Apple's workout names are not Orbit's four sports, and a Shortcut should not
 * have to know that — a phone that has to be taught a vocabulary is a phone
 * that stops sending. Anything unrecognised counts as cardio: it was still a
 * session, and refusing it would lose the day over a naming mismatch.
 */

export const INGEST_SPORTS = ["gym", "tennis", "cardio", "mobility"] as const;
export type IngestSport = (typeof INGEST_SPORTS)[number];

export function toIngestSport(value: string): IngestSport {
  const raw = value.trim().toLocaleLowerCase();
  if ((INGEST_SPORTS as readonly string[]).includes(raw)) {
    return raw as IngestSport;
  }
  if (/tennis|padel|squash|badminton/.test(raw)) return "tennis";
  if (/strength|weight|gym|functional|core|hiit/.test(raw)) return "gym";
  if (/yoga|stretch|mobility|pilates|flexib/.test(raw)) return "mobility";
  return "cardio";
}

/** Minutes, or null when the phone sent something that is not a duration. */
export function toIngestMinutes(value: unknown): number | null {
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) return null;
  return minutes;
}

/** An ISO day, or null — never a guess. */
export function toIngestDate(value: unknown): string | null {
  const asked = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : null;
}
