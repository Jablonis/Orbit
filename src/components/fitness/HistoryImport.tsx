"use client";

import { useRef, useState, useTransition } from "react";
import {
  importSetsAction,
  previewSetImportAction,
  type ImportSummary,
} from "@/app/fitness/import-actions";

/**
 * Bringing a history in from somewhere else.
 *
 * Two steps, and the first one is the whole point: read the file, say exactly
 * what it would do, and only then offer the button that does it. An import
 * that just runs is an import nobody can check, and this one writes into the
 * numbers every estimate and every "last time" is built on.
 *
 * So the preview names the exercises it matched and how many sets each has —
 * that is the "yes, this is my training" check — and it names every row it
 * would drop, and why. Nothing is thrown away quietly.
 *
 * The file is read in the browser and its text sent to the server, which parses
 * it in both steps. The names are matched against a 900 kB catalogue that has
 * no business here, and re-parsing on confirm means the rows that get written
 * are the ones the server read, not the ones a client handed back.
 */
export function HistoryImport() {
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [csv, setCsv] = useState("");
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "success" } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSummary(null);
    setCsv("");
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <section className="mt-4 rounded-xl border border-[var(--hairline)] p-4">
      <h3 className="text-[14px] font-semibold text-foreground">
        Import a training history
      </h3>
      <p className="mt-1 text-[12px] leading-[18px] text-muted-foreground">
        A CSV export from Strong or Hevy, or any file with a date, an exercise
        name, reps and a weight. Orbit shows you what it found before it writes
        anything, and importing the same file twice changes nothing.
      </p>

      <label className="mt-3 block">
        <span className="sr-only">Choose a CSV export</span>
        <input
          accept=".csv,text/csv,text/plain"
          className="field-input"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setNotice(null);
            setSummary(null);
            if (!file) return;
            startTransition(async () => {
              const text = await file.text();
              setCsv(text);
              const result = await previewSetImportAction(text);
              if (result.ok) setSummary(result.summary);
              else setNotice({ text: result.error, tone: "error" });
            });
          }}
          ref={fileInput}
          type="file"
        />
      </label>

      {pending && !summary ? (
        <p className="mt-3 text-[13px] text-muted-foreground" role="status">
          Reading the file…
        </p>
      ) : null}

      {summary ? (
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-foreground">
            {summary.sentence}
          </p>

          {summary.exercises.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1">
              {summary.exercises.map((exercise) => (
                <li
                  className="flex items-baseline justify-between gap-3 text-[12px]"
                  key={exercise.name}
                >
                  <span className="min-w-0 text-muted-foreground first-letter:uppercase">
                    {exercise.name}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {exercise.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {summary.unmatched.length > 0 ? (
            <div className="mt-3 rounded-lg border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] p-3">
              <p className="text-[12px] font-semibold">
                No exercise here answers to these, so their sets stay behind:
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {summary.unmatched.map((item) => (
                  <li
                    className="flex items-baseline justify-between gap-3 text-[12px] text-muted-foreground"
                    key={item.name}
                  >
                    <span className="min-w-0">{item.name}</span>
                    <span className="shrink-0 tabular-nums">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary.rejections.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-0.5">
              {summary.rejections.map((item) => (
                <li
                  className="text-[12px] leading-[18px] text-muted-foreground"
                  key={item.reason}
                >
                  {item.reason} <span className="tabular-nums">({item.count})</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="min-h-11 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
              disabled={pending || summary.sets === 0}
              onClick={() => {
                startTransition(async () => {
                  const result = await importSetsAction(csv);
                  setNotice(
                    result.ok
                      ? { text: `Imported. ${result.sentence}`, tone: "success" }
                      : { text: result.error, tone: "error" },
                  );
                  if (result.ok) reset();
                });
              }}
              type="button"
            >
              {pending ? "Importing…" : `Import ${summary.sets} sets`}
            </button>
            <button
              className="min-h-11 rounded-xl border border-[var(--hairline)] px-4 text-[13px] font-semibold text-muted-foreground"
              disabled={pending}
              onClick={() => {
                reset();
                setNotice(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p
          className="ui-inline-feedback mt-3"
          data-tone={notice.tone}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}
