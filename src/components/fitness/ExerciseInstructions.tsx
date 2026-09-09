import type { ExerciseGuide } from "@/lib/exercise-catalog";

/**
 * How to do it.
 *
 * The one thing Orbit's own library never had: an exercise was a name and a
 * rep range, and if you did not already know what a Romanian deadlift was, the
 * programme could not tell you.
 *
 * It takes a plain guide rather than a catalogue entry, and imports nothing
 * from the catalogue module, because the session log that renders it is a
 * client component — an import here would send 900 kB of JSON to the phone to
 * describe four exercises.
 *
 * The animation is optional and the panel has to be complete without it: the
 * media is © Gym visual and this repository does not carry it, so most
 * deployments render the words alone. That is why the steps are the layout and
 * the picture is an aside, rather than the other way round.
 */
export function ExerciseInstructions({ guide }: { guide: ExerciseGuide }) {
  return (
    <div>
      <ul className="flex flex-wrap gap-1.5">
        {guide.facts.map((fact) => (
          <li className="ui-badge text-[11px] first-letter:uppercase" key={fact}>
            {fact}
          </li>
        ))}
      </ul>

      {guide.mediaSrc ? (
        <figure className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the media
              lives on whatever host the deployment licensed it from, which the
              image optimiser would have to be told about one by one. */}
          <img
            alt={`${guide.name} demonstration`}
            className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-[var(--hairline)] bg-[var(--wash)]"
            height={180}
            loading="lazy"
            src={guide.mediaSrc}
            width={180}
          />
          <figcaption className="mt-1.5 text-center text-[11px] leading-4 text-muted-foreground">
            {guide.attribution}
          </figcaption>
        </figure>
      ) : null}

      {guide.steps.length > 0 ? (
        <ol className="mt-3 flex flex-col gap-2">
          {guide.steps.map((step, index) => (
            <li className="flex gap-2.5" key={step}>
              <span className="metric-value shrink-0 text-[12px] font-bold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-[13px] leading-5 text-foreground">
                {step}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
          This one came without instructions.
        </p>
      )}

      {guide.secondaryMuscles.length > 0 ? (
        <p className="mt-3 text-[12px] leading-4 text-muted-foreground">
          Also worked: {guide.secondaryMuscles.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
