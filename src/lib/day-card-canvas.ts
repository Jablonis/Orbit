/**
 * Day card renderer. Pure canvas drawing, kept out of the React component so
 * the shareable image can be rendered and reviewed on its own.
 */

export type DayCardContent = {
  altitude: number;
  date: string;
  ghost: string;
  metrics: Array<{ label: string; value: string }>;
  tierName: string;
  trace: number[];
};

export const DAY_CARD_WIDTH = 1080;
export const DAY_CARD_HEIGHT = 1350;

export function drawDayCard(
  context: CanvasRenderingContext2D,
  props: DayCardContent,
  accent: string,
) {
  const centerX = DAY_CARD_WIDTH / 2;
  const centerY = 580;
  const coreRadius = 118;
  const dialRadius = 330;
  const orbitRadius = 150 + (clamp(props.altitude) / 100) * 150;

  context.fillStyle = "#0d0d0e";
  context.fillRect(0, 0, DAY_CARD_WIDTH, DAY_CARD_HEIGHT);

  const glow = context.createRadialGradient(
    centerX,
    centerY,
    60,
    centerX,
    centerY,
    360,
  );
  glow.addColorStop(0, `${accent}2e`);
  glow.addColorStop(1, "#0d0d0e00");
  context.fillStyle = glow;
  context.fillRect(0, 0, DAY_CARD_WIDTH, DAY_CARD_HEIGHT);

  // Last two weeks as a dial, matching the orbit visual in the app.
  context.strokeStyle = "rgba(255,255,255,0.06)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centerX, centerY, dialRadius, 0, Math.PI * 2);
  context.stroke();

  props.trace.forEach((score, index) => {
    const angle = (index / props.trace.length) * Math.PI * 2 - Math.PI / 2;
    const reached = score >= 50;
    const length = 10 + (clamp(score) / 100) * 44;
    context.strokeStyle = reached ? accent : "rgba(255,255,255,0.22)";
    context.globalAlpha = reached
      ? 0.4 + (index / props.trace.length) * 0.6
      : 0.8;
    context.lineWidth = 9;
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

  context.strokeStyle = accent;
  context.globalAlpha = 0.75;
  context.lineWidth = 5;
  context.beginPath();
  context.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;

  context.fillStyle = accent;
  context.beginPath();
  context.arc(
    centerX + orbitRadius * Math.cos(-Math.PI * 0.78),
    centerY + orbitRadius * Math.sin(-Math.PI * 0.78),
    14,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.fillStyle = "#151516";
  context.beginPath();
  context.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.12)";
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = "#f7f7f5";
  context.font = "700 104px ui-sans-serif, system-ui, -apple-system, sans-serif";
  context.fillText(String(Math.round(props.altitude)), centerX, centerY + 22);
  context.font = "600 24px ui-sans-serif, system-ui, sans-serif";
  context.fillStyle = "#9ea2a4";
  context.fillText("ALTITUDE", centerX, centerY + 66);

  context.textAlign = "left";
  context.fillStyle = accent;
  context.font = "700 30px ui-sans-serif, system-ui, sans-serif";
  context.fillText("ORBIT", 90, 130);
  context.fillStyle = "#8d9092";
  context.font = "500 28px ui-sans-serif, system-ui, sans-serif";
  context.fillText(props.date, 90, 178);

  context.fillStyle = "#f7f7f5";
  context.font = "700 74px ui-sans-serif, system-ui, sans-serif";
  context.fillText(props.tierName, 90, 1030);
  context.fillStyle = "#c4c7c8";
  context.font = "500 32px ui-sans-serif, system-ui, sans-serif";
  context.fillText(props.ghost.slice(0, 64), 90, 1084);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(90, 1140);
  context.lineTo(DAY_CARD_WIDTH - 90, 1140);
  context.stroke();

  const columnWidth = (DAY_CARD_WIDTH - 180) / Math.max(1, props.metrics.length);
  props.metrics.forEach((metric, index) => {
    const x = 90 + columnWidth * index;
    context.fillStyle = "#8d9092";
    context.font = "600 24px ui-sans-serif, system-ui, sans-serif";
    context.fillText(metric.label.toUpperCase(), x, 1210);
    context.fillStyle = "#f7f7f5";
    context.font = "700 52px ui-sans-serif, system-ui, sans-serif";
    context.fillText(metric.value, x, 1272);
  });
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
