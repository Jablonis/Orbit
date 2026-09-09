"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPaletteAction, setThemeAction } from "@/app/theme-actions";
import {
  type PaletteChoice,
  type ThemeChoice as Choice,
  paletteChoices,
  themeChoices,
} from "@/lib/theme";

const labels: Record<Choice, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

const paletteLabels: Record<PaletteChoice, string> = {
  instrument: "Instrument",
  orbit: "Orbit",
};

const paletteNotes: Record<PaletteChoice, string> = {
  instrument: "Warm bone on near-black, one lime action colour, quieter tints.",
  orbit: "The plum accent and a colour for each half of the app.",
};

/**
 * Three states rather than a switch, because "follow the phone" is a real
 * answer and the commonest one: most people set this once, at the system
 * level, and never think about it again.
 */
export function ThemeChoice({
  palette,
  value,
}: {
  palette: PaletteChoice;
  value: Choice;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section
      aria-labelledby="appearance-heading"
      className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]"
    >
      <p className="label-caps text-muted-foreground" id="appearance-heading">
        Appearance
      </p>
      <div
        aria-label="Theme"
        className="mt-3 inline-flex rounded-xl border border-border bg-secondary p-1"
        role="group"
      >
        {themeChoices.map((choice) => (
          <button
            aria-pressed={value === choice}
            className={`min-h-11 rounded-[calc(var(--radius-md)-4px)] px-4 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
              value === choice
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            disabled={pending}
            key={choice}
            onClick={() =>
              startTransition(async () => {
                await setThemeAction(choice);
                router.refresh();
              })
            }
            type="button"
          >
            {labels[choice]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        System follows whatever your phone or laptop is set to.
      </p>

      {/* A second question, not the same one. Light or dark is how bright the
          room is; this is which app you would rather be looking at, and both
          palettes answer both. */}
      <p className="label-caps mt-5 text-muted-foreground" id="palette-heading">
        Palette
      </p>
      <div
        aria-labelledby="palette-heading"
        className="mt-3 inline-flex rounded-xl border border-border bg-secondary p-1"
        role="group"
      >
        {paletteChoices.map((choice) => (
          <button
            aria-pressed={palette === choice}
            className={`min-h-11 rounded-[calc(var(--radius-md)-4px)] px-4 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
              palette === choice
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            disabled={pending}
            key={choice}
            onClick={() =>
              startTransition(async () => {
                await setPaletteAction(choice);
                router.refresh();
              })
            }
            type="button"
          >
            {paletteLabels[choice]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        {paletteNotes[palette]}
      </p>
    </section>
  );
}
