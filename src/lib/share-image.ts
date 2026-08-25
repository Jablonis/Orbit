/**
 * Shared plumbing for the images Orbit hands out — the day card and the weekly
 * recap. Everything is drawn on the device; nothing is uploaded, and the file
 * only leaves the device if the person shares it themselves.
 */

export type ShareAction = "save" | "share";

/** Resolves a `var(--token)` colour against the live document. */
export function resolveColor(value: string, fallback = "#6B2FBF") {
  const match = /var\((--[\w-]+)\)/.exec(value);
  if (!match) return value || fallback;
  if (typeof window === "undefined") return fallback;
  const resolved = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(match[1])
    .trim();
  return resolved || fallback;
}

export async function renderToBlob({
  draw,
  height,
  width,
}: {
  draw: (context: CanvasRenderingContext2D) => void;
  height: number;
  width: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  draw(context);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/**
 * Shares the image where the platform supports it and falls back to a download
 * everywhere else. Returns the line to show, or an empty string when the person
 * simply cancelled the share sheet.
 */
export async function shareImage({
  action,
  blob,
  fileName,
  text,
}: {
  action: ShareAction;
  blob: Blob;
  fileName: string;
  text: string;
}) {
  const file = new File([blob], fileName, { type: "image/png" });

  if (
    action === "share" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({ files: [file], text });
    return "Shared.";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  return "Saved to your downloads.";
}
