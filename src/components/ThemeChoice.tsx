"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setThemeAction } from "@/app/theme-actions";
import { type ThemeChoice as Choice, themeChoices } from "@/lib/theme";

const labels: Record<Choice, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
};

/**
 * Three states rather than a switch, because "follow the phone" is a real
 * answer and the commonest one: most people set this once, at the system
 * level, and never think about it again.
 */
export function ThemeChoice({ value }: { value: Choice }) {
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
    </section>
  );
}
