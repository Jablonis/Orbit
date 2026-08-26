/**
 * Day card renderer. Pure canvas drawing, kept out of the React component so
 * the shareable image can be rendered and reviewed on its own.
 */

import type { PipMood } from "@/lib/mascot";
import { drawPip, pipWidth } from "@/lib/pip-canvas";

export type DayCardContent = {
  altitude: number;
  date: string;
  ghost: string;
  metrics: Array<{ label: string; value: string }>;
  mood: PipMood;
  tierName: string;
  trace: number[];
};

export const DAY_CARD_WIDTH = 1080;
export const DAY_CARD_HEIGHT = 1350;

const INK = "#141219";
const PAPER = "#F4F1F7";
const MUTED = "#8A8296";

const MONO = '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'Figtree, ui-sans-serif, system-ui, -apple-system, sans-serif';

/** Letter spacing is not in every engine; ignore it where it is missing. */
function withTracking(context: CanvasRenderingContext2D, value: string) {
  if ("letterSpacing" in context) {
    (context as CanvasRenderingContext2D & { letterSpacing: string })
      .letterSpacing = value;
  }
}

export function drawDayCard(
  context: CanvasRenderingContext2D,
  props: DayCardContent,
  accent: string,
) {
  const centerX = DAY_CARD_WIDTH / 2;
  const centerY = 580;
  const ringRadius = 250;
  const ringWidth = 46;
  const dialRadius = ringRadius + ringWidth / 2 + 34;
  const start = -Math.PI / 2;
  const sweep = (clamp(props.altitude) / 100) * Math.PI * 2;

  context.fillStyle = INK;
  context.fillRect(0, 0, DAY_CARD_WIDTH, DAY_CARD_HEIGHT);

  const glow = context.createRadialGradient(
    centerX,
    centerY,
    60,
    centerX,
    centerY,
    380,
  );
  glow.addColorStop(0, `${accent}26`);
  glow.addColorStop(1, `${INK}00`);
  context.fillStyle = glow;
  context.fillRect(0, 0, DAY_CARD_WIDTH, DAY_CARD_HEIGHT);

  // The altitude ring, in the same idiom as the rings inside the app.
  context.lineWidth = ringWidth;
  context.strokeStyle = accent;
  context.globalAlpha = 0.15;
  context.beginPath();
  context.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;

  if (sweep > 0) {
    const gradient = context.createLinearGradient(
      centerX - ringRadius,
      centerY + ringRadius,
      centerX + ringRadius,
      centerY - ringRadius,
    );
    gradient.addColorStop(0, `${accent}73`);
    gradient.addColorStop(1, accent);
    context.strokeStyle = gradient;
    context.lineCap = "round";
    context.beginPath();
    context.arc(centerX, centerY, ringRadius, start, start + sweep);
    context.stroke();
    context.lineCap = "butt";
  }

  // The last two weeks as a dial around the outside.
  props.trace.forEach((score, index) => {
    const angle = (index / props.trace.length) * Math.PI * 2 + start;
    const reached = score >= 50;
    const length = 8 + (clamp(score) / 100) * 34;
    context.strokeStyle = reached ? accent : "rgba(244,241,247,0.22)";
    context.globalAlpha = reached
      ? 0.4 + (index / props.trace.length) * 0.6
      : 0.75;
    context.lineWidth = 8;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(
      centerX + dialRadius * Math.cos(angle),
      centerY + dialRadius * Math.sin(angle),
    );
    context.lineTo(
      centerX + (dialRadius + length) * Math.cos(angle),
      centerY + (dialRadius + length) * Math.sin(angle),
    );
    context.stroke();
  });
  context.globalAlpha = 1;
  context.lineCap = "butt";

  context.textAlign = "center";
  context.fillStyle = PAPER;
  context.font = `700 132px ${SANS}`;
  context.fillText(String(Math.round(props.altitude)), centerX, centerY + 26);
  withTracking(context, "0.18em");
  context.font = `600 20px ${MONO}`;
  context.fillStyle = MUTED;
  context.fillText("ALTITUDE", centerX + 4, centerY + 76);

  context.textAlign = "left";
  context.fillStyle = PAPER;
  context.font = `700 30px ${SANS}`;
  context.fillText("ORBIT", 90, 130);
  context.font = `500 22px ${MONO}`;
  context.fillStyle = MUTED;
  context.fillText(props.date.toUpperCase(), 90, 176);
  withTracking(context, "0em");

  // Pip stands where the day is named, so the character travels with the card.
  const pipHeight = 230;
  drawPip(context, {
    burn: 0.9,
    height: pipHeight,
    mood: props.mood,
    x: DAY_CARD_WIDTH - 90 - pipWidth(pipHeight),
    y: 866,
  });

  context.fillStyle = PAPER;
  context.font = `700 74px ${SANS}`;
  context.fillText(props.tierName, 90, 1030);
  context.fillStyle = MUTED;
  context.font = `500 30px ${SANS}`;
  context.fillText(props.ghost.slice(0, 64), 90, 1084);

  context.strokeStyle = "rgba(244,241,247,0.10)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(90, 1140);
  context.lineTo(DAY_CARD_WIDTH - 90, 1140);
  context.stroke();

  const columnWidth = (DAY_CARD_WIDTH - 180) / Math.max(1, props.metrics.length);
  props.metrics.forEach((metric, index) => {
    const x = 90 + columnWidth * index;
    withTracking(context, "0.16em");
    context.fillStyle = MUTED;
    context.font = `600 20px ${MONO}`;
    context.fillText(metric.label.toUpperCase(), x, 1210);
    withTracking(context, "0em");
    context.fillStyle = PAPER;
    context.font = `700 52px ${SANS}`;
    context.fillText(metric.value, x, 1272);
  });
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
