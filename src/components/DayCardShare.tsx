"use client";

import { useRef, useState } from "react";
import {
  DAY_CARD_HEIGHT,
  DAY_CARD_WIDTH,
  type DayCardContent,
  drawDayCard,
} from "@/lib/day-card-canvas";

export type DayCardShareProps = DayCardContent & {
  tierColor: string;
};

function resolveColor(value: string, fallback = "#a3e635") {
  const match = /var\((--[\w-]+)\)/.exec(value);
  if (!match) return value || fallback;
  if (typeof window === "undefined") return fallback;
  const resolved = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(match[1])
    .trim();
  return resolved || fallback;
}

async function toBlob(props: DayCardShareProps, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = DAY_CARD_WIDTH;
  canvas.height = DAY_CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) return null;
  drawDayCard(context, props, accent);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/**
 * Turns the current orbit into a portrait PNG worth posting. Everything is
 * drawn locally; no image ever leaves the device unless the user shares it.
 */
export function DayCardShare(props: DayCardShareProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const accentRef = useRef<string>("");

  const accent = () => {
    if (!accentRef.current) accentRef.current = resolveColor(props.tierColor);
    return accentRef.current;
  };
  const fileName = `orbit-${props.date}.png`;

  const run = async (action: "save" | "share") => {
    setBusy(true);
    setStatus("");
    try {
      const blob = await toBlob(props, accent());
      if (!blob) {
        setStatus("This browser cannot render the card image.");
        return;
      }
      const file = new File([blob], fileName, { type: "image/png" });
      if (
        action === "share" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          text: `${props.tierName} · altitude ${props.altitude}`,
        });
        setStatus("Shared.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = fileName;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Saved to your downloads.");
    } catch (error) {
      setStatus(
        error instanceof Error && error.name === "AbortError"
          ? ""
          : "The card could not be generated.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[rgba(244,235,221,0.04)] px-4 text-[13px] font-semibold text-[var(--text-primary)] transition hover:bg-[rgba(244,235,221,0.08)] disabled:opacity-60"
          disabled={busy}
          onClick={() => void run("share")}
          type="button"
        >
          Share day card
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-4 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-60"
          disabled={busy}
          onClick={() => void run("save")}
          type="button"
        >
          Save PNG
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-4 text-[12px] text-[var(--text-muted)]">
        {status}
      </p>
    </div>
  );
}
