import type { ReactNode } from "react";
import { Pip } from "@/components/brand/Pip";
import { TintPanel } from "@/components/ui/tint-panel";
import type { PanelPip } from "@/lib/mascot";

export type TileTone = "fitness" | "plum" | "quiet" | "tasks";

const fill: Record<TileTone, string> = {
  fitness: "bg-fitness",
  plum: "bg-plum",
  quiet: "bg-muted-foreground/50",
  tasks: "bg-tasks",
};

/**
 * One thing, small.
 *
 * The dashboard used to lead with a hero card carrying the next move, and
 * everything else queued underneath it in full-width panels. Read on a phone
 * that is a lot of scrolling to learn four facts.
 *
 * A tile is those four facts in the shape people already read without being
 * taught: what this is, the one line that matters, how far along it is, and the
 * single thing you can do about it. Four of them fit on one screen, and the
 * page stops being a list of essays.
 */
export function DayTile({
  action,
  eyebrow,
  meta,
  pip,
  progress,
  seed = 0,
  title,
  tone,
  wide = false,
}: {
  /** Exactly one control. A tile with two is a card. */
  action?: ReactNode;
  eyebrow: string;
  /** The number in the corner: a count, a distance, a duration. */
  meta?: string;
  pip?: PanelPip;
  /** 0–1, or null where the tile has nothing to fill. */
  progress?: number | null;
  seed?: number;
  title: string;
  tone: TileTone;
  /** Spans both columns on a phone, where a lone third tile looks orphaned. */
  wide?: boolean;
}) {
  return (
    <TintPanel
      className={`flex min-h-[168px] flex-col gap-3 ${wide ? "col-span-2 sm:col-span-1" : ""}`}
      padding="sm"
      system={tone}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {pip ? (
            <Pip
              burn={pip.burn}
              className="h-7 w-auto shrink-0"
              kit={pip.kit}
              mood={pip.mood}
              seed={seed}
              size={28}
              title={pip.title}
            />
          ) : null}
          <p className="label-caps truncate text-[var(--ink,var(--muted-foreground))]">
            {eyebrow}
          </p>
        </div>
        {meta ? (
          <p className="metric-value shrink-0 text-[12px] font-bold text-[var(--ink,var(--muted-foreground))]">
            {meta}
          </p>
        ) : null}
      </div>

      <p className="line-clamp-3 text-[17px] font-bold leading-6 tracking-[-0.02em]">
        {title}
      </p>

      {typeof progress === "number" ? (
        <div
          aria-hidden="true"
          className="h-1.5 overflow-hidden rounded-full bg-card/70"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${fill[tone]}`}
            style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
          />
        </div>
      ) : null}

      {action ? <div className="mt-auto">{action}</div> : null}
    </TintPanel>
  );
}
