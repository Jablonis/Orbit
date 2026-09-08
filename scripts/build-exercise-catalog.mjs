#!/usr/bin/env node
/**
 * Builds `src/lib/exercise-catalog.json` from the upstream exercise dataset.
 *
 * Orbit's own library (`src/lib/exercises.ts`) is the 58 lifts the programme
 * is generated from, and it stays that way: it is curated, it carries the
 * movement pattern the generator sorts by, and it is small enough to argue
 * about. The catalogue is the other thing entirely — every exercise that
 * exists, with instructions, for looking something up and for swapping one
 * lift for another.
 *
 * Source: https://github.com/hasaneyldrm/exercises-dataset
 *
 *   - the data and the instruction text are MIT licensed;
 *   - the images and animations are © Gym visual and are **not** redistributed
 *     here. `scripts/fetch-exercise-media.sh` downloads them into an ignored
 *     directory for anyone whose own Gym visual terms allow it, and Orbit
 *     renders them only when `NEXT_PUBLIC_EXERCISE_MEDIA_BASE` is set.
 *
 * The generated file is committed so a build never reaches the network, and
 * regenerating it is one command:
 *
 *     git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset /tmp/exercises-dataset
 *     node scripts/build-exercise-catalog.mjs /tmp/exercises-dataset/data/exercises.json
 *
 * Only English is kept. The upstream file carries ten languages and weighs
 * 17 MB; Orbit speaks one, and the other nine would be nine tenths of the
 * bytes for nothing.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://github.com/hasaneyldrm/exercises-dataset";
const ATTRIBUTION = "© Gym visual — https://gymvisual.com/";

const input = process.argv[2];
if (!input) {
  console.error(
    "usage: node scripts/build-exercise-catalog.mjs <path to exercises.json>",
  );
  process.exit(1);
}

const upstream = JSON.parse(readFileSync(input, "utf8"));
if (!Array.isArray(upstream) || upstream.length === 0) {
  console.error(`${input} is not the upstream exercises array.`);
  process.exit(1);
}

/**
 * The id every logged set will carry for ever, so it has to be stable and it
 * has to satisfy the `exercise_id ~ '^[a-z0-9-]{1,60}$'` check the migration
 * puts on the column. Upstream ids are stable four-digit strings; the prefix
 * keeps them from ever colliding with a curated slug like `barbell-bench-press`
 * and says, in the database, where the row came from.
 */
const catalogId = (id) => `cat-${String(id).toLowerCase()}`;

/** The file name only — the base URL is a deployment's decision, not ours. */
const mediaFile = (path) => (typeof path === "string" ? path.split("/").pop() : "");

/**
 * Upstream has a handful of names where a degree sign went through the wrong
 * encoding twice and came out as `в°` — "sled 45в° leg press". Fixing it here
 * rather than in the app keeps the runtime free of a cleanup nobody reading it
 * would understand, and the next regeneration re-applies it.
 */
const fixEncoding = (value) => value.replaceAll("в°", "°");

const exercises = [];
const seen = new Set();

for (const row of upstream) {
  const id = catalogId(row.id);
  if (seen.has(id)) continue;
  seen.add(id);

  const steps = row.instruction_steps?.en;
  exercises.push({
    bodyPart: String(row.body_part ?? "").trim(),
    equipment: String(row.equipment ?? "").trim(),
    gif: mediaFile(row.gif_url),
    id,
    image: mediaFile(row.image),
    name: fixEncoding(String(row.name ?? "").trim()),
    secondaryMuscles: [
      ...new Set(
        (row.secondary_muscles ?? [])
          .map((muscle) => String(muscle).trim())
          .filter(Boolean),
      ),
    ],
    steps: Array.isArray(steps)
      ? steps.map((step) => fixEncoding(String(step).trim())).filter(Boolean)
      : [],
    target: String(row.target ?? "").trim(),
  });
}

exercises.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

const out = fileURLToPath(new URL("../src/lib/exercise-catalog.json", import.meta.url));
writeFileSync(
  out,
  `${JSON.stringify(
    {
      attribution: ATTRIBUTION,
      exercises,
      license: "Data and instructions: MIT. Media: © Gym visual, not redistributed.",
      source: SOURCE_URL,
    },
    null,
    0,
  )}\n`,
);

console.log(`✓ ${exercises.length} exercises → src/lib/exercise-catalog.json`);
