import Link from "next/link";
import type { ReactNode } from "react";
import { Pip } from "@/components/brand/Pip";
import type { PipMood } from "@/lib/mascot";

/**
 * Nothing here yet.
 *
 * An empty state used to be a grey glyph in a circle. It is now Pip on the
 * ground with the engine off, which is exactly what an empty list is: nothing
 * has been asked of the day, so nothing is burning. It is the same character
 * the dashboard uses, so the emptiest screen in Orbit still has someone on it.
 */

export function EmptyState({
  action,
  actionHref,
  actionLabel,
  description,
  mood = "grounded",
  seed = 0,
  title,
}: {
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  description: string;
  /** Grounded by default: an empty list is a penguin waiting, not a sad one. */
  mood?: PipMood;
  seed?: number;
  title: string;
}) {
  return (
    <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-input bg-[rgba(244,235,221,0.018)] p-6 text-center">
      <div className="max-w-sm">
        <Pip
          burn={0.15}
          className="mx-auto"
          mood={mood}
          seed={seed}
          size={56}
        />
        <p className="mt-3 text-[15px] font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[12px] leading-[18px] text-muted-foreground">{description}</p>
        {action ? <div className="mt-4">{action}</div> : actionHref && actionLabel ? (
          <Link
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-input bg-[rgba(244,235,221,0.045)] px-4 text-[12px] font-semibold text-foreground transition duration-150 hover:bg-[rgba(244,235,221,0.08)]"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
