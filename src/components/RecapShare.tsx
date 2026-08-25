"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  RECAP_CARD_HEIGHT,
  RECAP_CARD_WIDTH,
  type RecapCardContent,
  drawRecapCard,
} from "@/lib/recap-canvas";
import {
  type ShareAction,
  renderToBlob,
  resolveColor,
  shareImage,
} from "@/lib/share-image";

export type RecapShareProps = RecapCardContent & {
  tierColor: string;
  weekStart: string;
};

/** Turns the finished week into a portrait PNG worth sending to someone. */
export function RecapShare(props: RecapShareProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const accentRef = useRef("");

  const accent = () => {
    if (!accentRef.current) accentRef.current = resolveColor(props.tierColor);
    return accentRef.current;
  };

  const run = async (action: ShareAction) => {
    setBusy(true);
    setStatus("");
    try {
      const blob = await renderToBlob({
        draw: (context) => drawRecapCard(context, props, accent()),
        height: RECAP_CARD_HEIGHT,
        width: RECAP_CARD_WIDTH,
      });
      if (!blob) {
        setStatus("This browser cannot render the card image.");
        return;
      }
      setStatus(
        await shareImage({
          action,
          blob,
          fileName: `orbit-week-${props.weekStart}.png`,
          text: `${props.headline} ${props.verdict}`,
        }),
      );
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
    <div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void run("share")} type="button">
          Share the week
        </Button>
        <Button
          disabled={busy}
          onClick={() => void run("save")}
          type="button"
          variant="ghost"
        >
          Save PNG
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-4 text-[12px] text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
