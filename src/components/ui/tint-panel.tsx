import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The container of the v2 system. A panel is a soft tint, not a bordered box:
 * the colour says which system you are looking at, so the chrome does not have
 * to. Neutral is the default for anything that is not domain-specific.
 */
const tintPanelVariants = cva("rounded-2xl", {
  defaultVariants: { padding: "default", system: "neutral" },
  variants: {
    padding: {
      default: "p-6",
      none: "",
      sm: "p-4",
    },
    system: {
      finance: "bg-finance-tint text-foreground [--ink:var(--finance-ink)]",
      fitness: "bg-fitness-tint text-foreground [--ink:var(--fitness-ink)]",
      neutral:
        "bg-card text-card-foreground shadow-[0_1px_2px_rgba(27,26,31,0.05)] [--ink:var(--muted-foreground)]",
      plum: "bg-plum-tint text-foreground [--ink:var(--plum-ink)]",
      quiet: "bg-muted text-foreground [--ink:var(--muted-foreground)]",
      tasks: "bg-tasks-tint text-foreground [--ink:var(--tasks-ink)]",
    },
  },
});

function TintPanel({
  className,
  padding,
  system,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof tintPanelVariants>) {
  return (
    <div
      className={cn(tintPanelVariants({ className, padding, system }))}
      data-slot="tint-panel"
      {...props}
    />
  );
}

const systemColor = {
  finance: "var(--finance)",
  fitness: "var(--fitness)",
  plum: "var(--plum)",
  tasks: "var(--tasks)",
} as const;

export type OrbitSystem = keyof typeof systemColor;

function SystemDot({
  className,
  system,
}: {
  className?: string;
  system: OrbitSystem;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: systemColor[system] }}
    />
  );
}

export { SystemDot, TintPanel, systemColor, tintPanelVariants };
