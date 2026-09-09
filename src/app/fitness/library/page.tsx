import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/AppNavigation";
import { EmptyState } from "@/components/EmptyState";
import { ExerciseInstructions } from "@/components/fitness/ExerciseInstructions";
import { PageHeader, Surface } from "@/components/ui/Primitives";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  CATALOG,
  CATALOG_BODY_PARTS,
  CATALOG_SOURCE,
  buildExerciseGuide,
  catalogKit,
  catalogMuscle,
  equipmentInList,
  getCatalogExercise,
  searchCatalog,
} from "@/lib/exercise-catalog";
import { expandEquipment } from "@/lib/exercises";
import { getFitnessProfile } from "@/lib/fitness-setup";
import { getDashboardPreferences } from "@/lib/preferences";
import { getAppearance } from "@/lib/appearance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exercise library",
};

/** Enough to scroll, few enough that a phone renders it in one frame. */
const PAGE_SIZE = 48;

type Query = {
  equipment?: string;
  exercise?: string;
  kit?: string;
  part?: string;
  q?: string;
};

/**
 * The library.
 *
 * 1 324 exercises with instructions, which is roughly 1 266 more than the
 * programme is built from — and that is the point of it. The programme decides
 * what you do; this answers the other two questions a gym produces, "what is
 * this thing" and "what else trains the same muscle when the rack is taken".
 *
 * A server component on purpose. The catalogue is 900 kB of JSON, and none of
 * it belongs on a phone: the filtering happens here and what crosses the wire
 * is the page of rows someone actually asked for. Which also means the filters
 * are links and the search is a plain GET form — the whole screen works before
 * a single byte of JavaScript arrives, and every state of it can be linked to.
 */
export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  const [preferences, profile, params] = await Promise.all([
    getDashboardPreferences(supabase, user.id),
    getFitnessProfile(supabase, user.id),
    searchParams,
  ]);

  const search = (params.q ?? "").trim();
  const part = params.part ?? "";
  const equipment = params.equipment ?? "";
  const onlyMyKit = params.kit === "mine" && profile !== null;
  const kit = onlyMyKit && profile ? [...expandEquipment(profile.equipment)] : undefined;

  const matched = searchCatalog({
    bodyPart: part || undefined,
    equipment: equipment || undefined,
    kit,
    search: search || undefined,
  });
  const shown = matched.slice(0, PAGE_SIZE);

  const selected = params.exercise ? getCatalogExercise(params.exercise) : null;

  /** A link that changes one filter and keeps the rest of the screen. */
  const href = (changes: Partial<Query>) => {
    const next = new URLSearchParams();
    const merged: Query = {
      equipment,
      kit: onlyMyKit ? "mine" : "",
      part,
      q: search,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/fitness/library?${query}` : "/fitness/library";
  };

  const { palette, theme } = await getAppearance();

  return (
    <main className="app-shell" id="main-content" tabIndex={-1}>
      <AppNavigation
        active="fitness"
        profile={preferences.regional}
        palette={palette}
        theme={theme}
        userEmail={user.email ?? "Orbit user"}
      />

      <section className="page-container py-8">
        <PageHeader
          action={
            <Link
              className="ui-button ui-button--secondary"
              href="/fitness"
            >
              Back to Fitness
            </Link>
          }
          description={`${CATALOG.length.toLocaleString("en-GB")} exercises with instructions, for looking one up or finding something that trains the same muscle.`}
          eyebrow="Fitness"
          title="Exercise library"
        />

        <Surface className="mt-7 p-4">
          <form action="/fitness/library" className="flex flex-wrap gap-2">
            {part ? <input name="part" type="hidden" value={part} /> : null}
            {equipment ? (
              <input name="equipment" type="hidden" value={equipment} />
            ) : null}
            {onlyMyKit ? <input name="kit" type="hidden" value="mine" /> : null}
            <label className="min-w-0 flex-1">
              <span className="sr-only">Search the exercise library</span>
              <input
                className="field-input"
                defaultValue={search}
                name="q"
                placeholder="Search — “cable row”, “calf”, “kettlebell”"
                type="search"
              />
            </label>
            <button className="ui-button ui-button--primary" type="submit">
              Search
            </button>
          </form>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            <li>
              <Chip current={!part} href={href({ part: "" })}>
                Everything
              </Chip>
            </li>
            {CATALOG_BODY_PARTS.map((bodyPart) => (
              <li key={bodyPart}>
                <Chip
                  current={part === bodyPart}
                  href={href({ equipment: "", part: bodyPart })}
                >
                  {bodyPart}
                </Chip>
              </li>
            ))}
          </ul>

          {/* Derived from the filtered list, so every chip has results behind
              it — the alternative is 28 chips and half of them empty. */}
          <ul className="mt-2 flex flex-wrap gap-1.5">
            <li>
              <Chip current={!equipment} href={href({ equipment: "" })}>
                Any equipment
              </Chip>
            </li>
            {equipmentInList(
              searchCatalog({
                bodyPart: part || undefined,
                kit,
                search: search || undefined,
              }),
            )
              .slice(0, 10)
              .map((item) => (
                <li key={item}>
                  <Chip
                    current={equipment === item}
                    href={href({ equipment: item })}
                  >
                    {item}
                  </Chip>
                </li>
              ))}
          </ul>

          {profile ? (
            <div className="mt-3">
              <Chip
                current={onlyMyKit}
                href={href({ equipment: "", kit: onlyMyKit ? "" : "mine" })}
              >
                {onlyMyKit ? "✓ " : ""}Only what my kit can do
              </Chip>
            </div>
          ) : null}
        </Surface>

        {selected ? (
          <Surface className="mt-4 p-4" tone="secondary">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="card-title text-foreground first-letter:uppercase">
                {selected.name}
              </h2>
              <Link
                className="text-[13px] font-semibold text-muted-foreground underline-offset-4 hover:underline"
                href={href({ exercise: "" })}
                scroll={false}
              >
                Close
              </Link>
            </div>
            <div className="mt-3">
              <ExerciseInstructions guide={buildExerciseGuide(selected)} />
            </div>
          </Surface>
        ) : null}

        <p className="mt-6 text-[13px] text-muted-foreground" role="status">
          {matched.length === 0
            ? "No exercise matches that."
            : matched.length > shown.length
              ? `Showing ${shown.length} of ${matched.length.toLocaleString("en-GB")}. Add a word to narrow it.`
              : `${matched.length} ${matched.length === 1 ? "exercise" : "exercises"}.`}
        </p>

        {matched.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              actionHref="/fitness/library"
              actionLabel="Clear the filters"
              description="Nothing in the catalogue matches every word and filter at once. Fewer words usually finds it."
              title="Nothing matches"
            />
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {shown.map((exercise) => {
              const muscle = catalogMuscle(exercise);
              return (
                <li key={exercise.id}>
                  <Link
                    aria-current={
                      selected?.id === exercise.id ? "true" : undefined
                    }
                    className={`flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border px-3.5 py-2.5 transition ${
                      selected?.id === exercise.id
                        ? "border-primary bg-[var(--wash)]"
                        : "border-[var(--hairline)] hover:bg-[var(--wash)]"
                    }`}
                    href={href({ exercise: exercise.id })}
                    scroll={false}
                  >
                    <span className="min-w-0 text-[14px] font-semibold text-foreground first-letter:uppercase">
                      {exercise.name}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {muscle ?? "cardio"} ·{" "}
                      {exercise.equipment || "no equipment"}
                      <span className="sr-only">
                        {" "}
                        — needs{" "}
                        {catalogKit(exercise).join(" or ").replace(/_/g, " ")}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8 text-[12px] leading-5 text-muted-foreground">
          Exercise names and instructions come from{" "}
          <a
            className="underline underline-offset-4"
            href={CATALOG_SOURCE}
            rel="noreferrer noopener"
            target="_blank"
          >
            hasaneyldrm/exercises-dataset
          </a>{" "}
          under the MIT licence. The animations are © Gym visual and are not
          part of Orbit; a deployment that has licensed them can point
          <code className="code-caps"> NEXT_PUBLIC_EXERCISE_MEDIA_BASE </code>
          at its own copy.
        </p>
      </section>
    </main>
  );
}

/** A filter that is a link, so the screen works without JavaScript. */
function Chip({
  children,
  current,
  href,
}: {
  children: React.ReactNode;
  current: boolean;
  href: string;
}) {
  return (
    <Link
      aria-current={current ? "true" : undefined}
      className={`ui-badge min-h-11 text-[12px] transition first-letter:uppercase ${
        current
          ? "border-primary bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-foreground"
          : "hover:border-input hover:bg-secondary"
      }`}
      href={href}
      scroll={false}
    >
      {children}
    </Link>
  );
}
