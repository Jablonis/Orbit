import { CATALOG } from "@/lib/exercise-catalog";
import { EXERCISES } from "@/lib/exercises";

/**
 * Bringing a training history in.
 *
 * Someone arriving at Orbit with two years of sets in Strong or Hevy has the
 * one thing the programme cannot generate: what they can actually lift. Making
 * them start from an empty history is asking them to throw it away, and "last
 * time" — the single most useful line in the session log — stays blank for six
 * weeks while it rebuilds.
 *
 * The parser is deliberately generous about shape and strict about values. It
 * finds its columns by name, so a file with the columns in a different order
 * or with three extra ones works; and it drops any row it cannot fully
 * believe, saying why, rather than importing a set with a plausible-looking
 * zero in it. What comes out is what the database will accept, or nothing.
 */

export type ImportRow = {
  exerciseId: string;
  /** The name as written in the file, so a preview can be read back. */
  sourceName: string;
  performedOn: string;
  reps: number;
  setIndex: number;
  weightKg: number;
};

export type ImportRejection = {
  count: number;
  /** Why, in words a person can act on. */
  reason: string;
};

export type ImportPreview = {
  /** Distinct days the import would touch. */
  days: number;
  firstDay: string;
  lastDay: string;
  rejections: ImportRejection[];
  rows: ImportRow[];
  /** Names in the file that no exercise here answers to, most rows first. */
  unmatched: Array<{ count: number; name: string }>;
};

/** One file, one import. Past this it is a database migration, not a paste. */
export const IMPORT_ROW_LIMIT = 2000;

/** The database allows ten sets per exercise per day, and so does this. */
const MAX_SET_INDEX = 10;

const COLUMNS = {
  date: ["date", "start_time", "workout date", "performed_on", "day"],
  exercise: ["exercise name", "exercise_title", "exercise", "exercise_name"],
  reps: ["reps", "repetitions", "rep"],
  setIndex: ["set order", "set_index", "set", "set number"],
  setType: ["set_type", "set type"],
  weight: ["weight", "weight_kg", "kg", "weight (kg)", "weight (lbs)", "lbs"],
};

/**
 * Splits a line the way a spreadsheet does: commas outside quotes, doubled
 * quotes as a literal one. Written out rather than pulled in, because the one
 * thing this has to handle is an exercise name with a comma in it.
 */
export function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

/** Whichever of comma, semicolon and tab the header line uses most. */
export function detectDelimiter(headerLine: string): string {
  const counts = [",", ";", "\t"].map((delimiter) => ({
    delimiter,
    count: splitRow(headerLine, delimiter).length,
  }));
  return counts.sort((a, b) => b.count - a.count)[0].delimiter;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The key two names match on when they are the same exercise written in a
 * different order: Strong writes "Bench Press (Barbell)" and the catalogue
 * writes "barbell bench press". Sorted words make those one key, and it costs
 * nothing that a genuinely different exercise would collide on — an anagram of
 * an exercise name is not a thing that happens.
 */
function tokenKey(value: string) {
  return [...new Set(normalizeName(value).split(" "))].filter(Boolean).sort().join(" ");
}

/**
 * Names to ids, curated first.
 *
 * The 55 curated lifts win every tie, because a set logged against
 * `barbell-bench-press` shows up in the programme's own "last time" line and
 * one logged against `cat-0025` does not. Everything else falls through to the
 * catalogue, which is why a history full of machine work still lands.
 */
function buildIndex(entries: Array<{ id: string; name: string }>) {
  const exact = new Map<string, string>();
  const tokens = new Map<string, string>();
  for (const entry of entries) {
    const key = normalizeName(entry.name);
    if (key && !exact.has(key)) exact.set(key, entry.id);
    const token = tokenKey(entry.name);
    if (token && !tokens.has(token)) tokens.set(token, entry.id);
  }
  return { exact, tokens };
}

/**
 * Words that say what a lift is performed with rather than what it is.
 *
 * This is the whole of the difference between a qualifier and a variant, and
 * it matters more than it looks: "Lateral Raise (Dumbbell)" is Orbit's lateral
 * raise, but "Incline Bench Press (Barbell)" is emphatically not its bench
 * press — importing one onto the other would put incline numbers into a flat
 * bench's history and every estimate built on it.
 */
const EQUIPMENT_WORDS = new Set([
  "band",
  "bands",
  "bar",
  "barbell",
  "bodyweight",
  "cable",
  "dumbbell",
  "dumbbells",
  "ez",
  "kettlebell",
  "machine",
  "plate",
  "smith",
  "weighted",
]);

function tokensOf(value: string) {
  return [...new Set(normalizeName(value).split(" "))].filter(Boolean);
}

let indexes: {
  catalog: ReturnType<typeof buildIndex>;
  curated: ReturnType<typeof buildIndex>;
  curatedTokens: Array<{ id: string; tokens: string[] }>;
} | null = null;

function getIndexes() {
  indexes = indexes ?? {
    catalog: buildIndex(CATALOG),
    curated: buildIndex(EXERCISES),
    curatedTokens: EXERCISES.map((exercise) => ({
      id: exercise.id,
      tokens: tokensOf(exercise.name),
    })),
  };
  return indexes;
}

/**
 * The exercise a written name means here, or null.
 *
 * Five passes, curated before catalogue at every step: the exact name, the
 * same words in another order, the curated lift the name is that lift plus a
 * piece of equipment, and then the same two passes over the catalogue. A name
 * that reaches the end unmatched stays unmatched and is reported — an import
 * that guesses is an import that quietly rewrites someone's history.
 */
export function matchExerciseName(name: string): string | null {
  const { catalog, curated, curatedTokens } = getIndexes();
  const normalized = normalizeName(name);
  if (!normalized) return null;
  const token = tokenKey(name);

  const direct = curated.exact.get(normalized) ?? curated.tokens.get(token);
  if (direct) return direct;

  const words = new Set(tokensOf(name));
  const qualified = curatedTokens.filter(
    (entry) =>
      entry.tokens.length > 0 &&
      entry.tokens.every((word) => words.has(word)) &&
      [...words].every(
        (word) => entry.tokens.includes(word) || EQUIPMENT_WORDS.has(word),
      ),
  );
  // Exactly one, or none: two curated lifts both answering to a name means the
  // name does not say which, and picking either is a coin toss with a history.
  if (qualified.length === 1) return qualified[0].id;

  return catalog.exact.get(normalized) ?? catalog.tokens.get(token) ?? null;
}

/**
 * A date, from the four shapes these exports actually use: an ISO day, an ISO
 * timestamp, `YYYY-MM-DD HH:MM:SS`, and `DD/MM/YYYY`. Anything else is
 * rejected — guessing whether 03/04 is March or April silently moves someone's
 * training history by a month.
 */
export function parseDay(value: string): string | null {
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return isRealDay(iso[1], iso[2], iso[3]) ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;

  const slashed = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashed) {
    return isRealDay(slashed[3], slashed[2], slashed[1])
      ? `${slashed[3]}-${slashed[2]}-${slashed[1]}`
      : null;
  }
  return null;
}

function isRealDay(year: string, month: string, day: string) {
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
}

function findColumn(header: string[], names: string[]): number {
  const normalized = header.map((cell) => normalizeName(cell));
  for (const name of names) {
    const at = normalized.indexOf(normalizeName(name));
    if (at >= 0) return at;
  }
  return -1;
}

/**
 * The file, read.
 *
 * `today` bounds the future: a set dated next March is a column read as a date
 * that is not one, and importing it would put a phantom session in the plan.
 */
export function parseSetExport(
  csv: string,
  today: string,
): ImportPreview {
  const empty: ImportPreview = {
    days: 0,
    firstDay: "",
    lastDay: "",
    rejections: [],
    rows: [],
    unmatched: [],
  };

  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return { ...empty, rejections: [{ count: 1, reason: "The file has no rows." }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = splitRow(lines[0], delimiter);
  const at = {
    date: findColumn(header, COLUMNS.date),
    exercise: findColumn(header, COLUMNS.exercise),
    reps: findColumn(header, COLUMNS.reps),
    setIndex: findColumn(header, COLUMNS.setIndex),
    setType: findColumn(header, COLUMNS.setType),
    weight: findColumn(header, COLUMNS.weight),
  };

  if (at.date < 0 || at.exercise < 0 || at.reps < 0) {
    return {
      ...empty,
      rejections: [
        {
          count: 1,
          reason:
            "No date, exercise and reps columns were found. A Strong or Hevy export has all three.",
        },
      ],
    };
  }

  // Strong exports in whatever unit the account is set to, and says so in the
  // column name. Nothing else in the file distinguishes the two.
  const inPounds = /lb/i.test(header[at.weight] ?? "");

  const rows: ImportRow[] = [];
  const rejections = new Map<string, number>();
  const unmatched = new Map<string, number>();
  const nextIndex = new Map<string, number>();
  const reject = (reason: string) =>
    rejections.set(reason, (rejections.get(reason) ?? 0) + 1);

  for (const line of lines.slice(1)) {
    if (rows.length >= IMPORT_ROW_LIMIT) {
      reject(`Only the first ${IMPORT_ROW_LIMIT} sets in a file are imported.`);
      continue;
    }
    const cells = splitRow(line, delimiter);

    // Hevy marks warm-ups, and a warm-up in the history would drag "last time"
    // and every estimate down with it. Orbit has no idea of a warm-up set, so
    // the honest thing is to leave them out and say so.
    const setType = (cells[at.setType] ?? "").toLowerCase();
    if (setType.includes("warm")) {
      reject("Warm-up sets were left out.");
      continue;
    }

    const performedOn = parseDay(cells[at.date] ?? "");
    if (!performedOn) {
      reject("A row had no date Orbit could read.");
      continue;
    }
    if (performedOn > today) {
      reject("A row was dated in the future.");
      continue;
    }

    const sourceName = (cells[at.exercise] ?? "").trim();
    const exerciseId = sourceName ? matchExerciseName(sourceName) : null;
    if (!exerciseId) {
      if (sourceName) unmatched.set(sourceName, (unmatched.get(sourceName) ?? 0) + 1);
      else reject("A row had no exercise name.");
      continue;
    }

    const reps = Number((cells[at.reps] ?? "").replace(",", "."));
    if (!Number.isFinite(reps) || reps < 1 || reps > 200 || !Number.isInteger(reps)) {
      reject("A row had reps outside 1 to 200.");
      continue;
    }

    const rawWeight = (cells[at.weight] ?? "").replace(",", ".").trim();
    const parsed = rawWeight ? Number(rawWeight) : 0;
    if (!Number.isFinite(parsed) || parsed < 0) {
      reject("A row had a weight Orbit could not read.");
      continue;
    }
    const weightKg = round2(inPounds ? parsed * 0.45359237 : parsed);
    if (weightKg > 500) {
      reject("A row had a weight over 500 kg.");
      continue;
    }

    // The file's own set number where there is one, and a running count where
    // there is not — either way the database sees 1, 2, 3 for a day.
    const key = `${performedOn}|${exerciseId}`;
    const counted = (nextIndex.get(key) ?? 0) + 1;
    nextIndex.set(key, counted);
    if (counted > MAX_SET_INDEX) {
      reject(`Only ${MAX_SET_INDEX} sets of one exercise a day can be stored.`);
      continue;
    }

    rows.push({
      exerciseId,
      performedOn,
      reps,
      setIndex: counted,
      sourceName,
      weightKg,
    });
  }

  const days = [...new Set(rows.map((row) => row.performedOn))].sort();

  return {
    days: days.length,
    firstDay: days[0] ?? "",
    lastDay: days[days.length - 1] ?? "",
    rejections: [...rejections.entries()]
      .map(([reason, count]) => ({ count, reason }))
      .sort((a, b) => b.count - a.count),
    rows,
    unmatched: [...unmatched.entries()]
      .map(([name, count]) => ({ count, name }))
      .sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1)),
  };
}

/** "412 sets across 63 days, 2 Jan to 30 Aug." */
export function describeImport(preview: ImportPreview): string {
  if (preview.rows.length === 0) return "Nothing in this file can be imported.";
  const sets = `${preview.rows.length} ${preview.rows.length === 1 ? "set" : "sets"}`;
  const days = `${preview.days} ${preview.days === 1 ? "day" : "days"}`;
  const span =
    preview.firstDay === preview.lastDay
      ? preview.firstDay
      : `${preview.firstDay} to ${preview.lastDay}`;
  return `${sets} across ${days}, ${span}.`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
