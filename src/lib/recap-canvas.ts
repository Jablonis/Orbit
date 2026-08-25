/**
 * Weekly recap card renderer.
 *
 * Same idea as the day card and the same 4:5 portrait, but the subject is the
 * week: seven columns, the days that held orbit lit, and the one line that
 * says how the week went. Pure canvas, kept out of the component so the image
 * can be rendered and looked at on its own.
 */

export type RecapCardContent = {
  altitudeChange: number;
  days: Array<{ inOrbit: boolean; label: string; score: number }>;
  headline: string;
  isBestWeek: boolean;
  label: string;
  stats: Array<{ label: string; value: string }>;
  tierName: string;
  verdict: string;
};

export const RECAP_CARD_WIDTH = 1080;
export const RECAP_CARD_HEIGHT = 1350;

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";

const INK = "#141219";
const PAPER = "#F4F1F7";
const MUTED = "#8A8296";

function withTracking(context: CanvasRenderingContext2D, value: string) {
  if ("letterSpacing" in context) {
    (context as CanvasRenderingContext2D & { letterSpacing: string })
      .letterSpacing = value;
  }
}

function roundedBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const radius = Math.min(width / 2, height / 2);
  context.beginPath();
  context.moveTo(x, y + height - radius);
  context.arcTo(x, y, x + radius, y, radius);
  context.lineTo(x + width - radius, y);
  context.arcTo(x + width, y, x + width, y + radius, radius);
  context.lineTo(x + width, y + height - radius);
  context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  context.lineTo(x + radius, y + height);
  context.arcTo(x, y + height, x, y + height - radius, radius);
  context.closePath();
  context.fill();
}

/** Draws `text` at the largest size that still fits the width given. */
function fittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
) {
  let current = size;
  context.font = `700 ${current}px ${SANS}`;
  while (context.measureText(text).width > maxWidth && current > 40) {
    current -= 4;
    context.font = `700 ${current}px ${SANS}`;
  }
  context.fillText(text, x, y);
}

export function drawRecapCard(
  context: CanvasRenderingContext2D,
  props: RecapCardContent,
  accent: string,
) {
  context.fillStyle = INK;
  context.fillRect(0, 0, RECAP_CARD_WIDTH, RECAP_CARD_HEIGHT);

  const glow = context.createRadialGradient(540, 760, 40, 540, 760, 620);
  glow.addColorStop(0, `${accent}2E`);
  glow.addColorStop(1, `${INK}00`);
  context.fillStyle = glow;
  context.fillRect(0, 0, RECAP_CARD_WIDTH, RECAP_CARD_HEIGHT);

  // Masthead.
  context.textAlign = "left";
  context.fillStyle = PAPER;
  context.font = `700 30px ${SANS}`;
  context.fillText("ORBIT", 90, 130);
  withTracking(context, "0.18em");
  context.font = `500 22px ${MONO}`;
  context.fillStyle = MUTED;
  context.fillText(`WEEK · ${props.label.toUpperCase()}`, 90, 178);
  withTracking(context, "0em");

  if (props.isBestWeek) {
    context.textAlign = "right";
    withTracking(context, "0.16em");
    context.font = `600 20px ${MONO}`;
    context.fillStyle = accent;
    context.fillText("BEST WEEK YET", RECAP_CARD_WIDTH - 90, 178);
    withTracking(context, "0em");
    context.textAlign = "left";
  }

  // The headline carries the week; everything else supports it.
  context.fillStyle = PAPER;
  fittedText(context, props.headline, 90, 330, RECAP_CARD_WIDTH - 180, 96);
  context.fillStyle = MUTED;
  context.font = `500 34px ${SANS}`;
  context.fillText(props.verdict.slice(0, 52), 90, 396);

  // Seven columns. A day that held orbit is lit; the rest stay as ground.
  const columnGap = 26;
  const columnWidth =
    (RECAP_CARD_WIDTH - 180 - columnGap * 6) / Math.max(1, props.days.length);
  const baseline = 900;
  const maxHeight = 380;

  props.days.forEach((day, index) => {
    const x = 90 + (columnWidth + columnGap) * index;
    const height = Math.max(
      12,
      (Math.max(0, Math.min(100, day.score)) / 100) * maxHeight,
    );

    context.fillStyle = "rgba(244,241,247,0.07)";
    roundedBar(context, x, baseline - maxHeight, columnWidth, maxHeight);

    if (day.inOrbit) {
      const gradient = context.createLinearGradient(
        x,
        baseline,
        x,
        baseline - height,
      );
      gradient.addColorStop(0, `${accent}99`);
      gradient.addColorStop(1, accent);
      context.fillStyle = gradient;
    } else {
      context.fillStyle = "rgba(244,241,247,0.24)";
    }
    roundedBar(context, x, baseline - height, columnWidth, height);

    context.textAlign = "center";
    withTracking(context, "0.12em");
    context.font = `600 20px ${MONO}`;
    context.fillStyle = day.inOrbit ? PAPER : MUTED;
    context.fillText(
      day.label.slice(0, 2).toUpperCase(),
      x + columnWidth / 2,
      baseline + 46,
    );
    withTracking(context, "0em");
  });

  // Tier and altitude movement, then the numbers.
  context.textAlign = "left";
  context.fillStyle = PAPER;
  fittedText(context, props.tierName, 90, 1060, RECAP_CARD_WIDTH - 180, 56);
  context.fillStyle = props.altitudeChange >= 0 ? accent : MUTED;
  context.font = `600 30px ${SANS}`;
  context.fillText(
    `${props.altitudeChange >= 0 ? "+" : "−"}${Math.abs(props.altitudeChange)} altitude this week`,
    90,
    1108,
  );

  context.strokeStyle = "rgba(244,241,247,0.10)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(90, 1168);
  context.lineTo(RECAP_CARD_WIDTH - 90, 1168);
  context.stroke();

  const statWidth = (RECAP_CARD_WIDTH - 180) / Math.max(1, props.stats.length);
  props.stats.forEach((stat, index) => {
    const x = 90 + statWidth * index;
    withTracking(context, "0.16em");
    context.fillStyle = MUTED;
    context.font = `600 20px ${MONO}`;
    context.fillText(stat.label.toUpperCase(), x, 1232);
    withTracking(context, "0em");
    context.fillStyle = PAPER;
    context.font = `700 52px ${SANS}`;
    context.fillText(stat.value, x, 1294);
  });
}
