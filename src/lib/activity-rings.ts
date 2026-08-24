/**
 * Geometry for the daily activity rings. Kept pure so the ring maths — which
 * has to survive empty days, partial days, and days past the goal — can be
 * tested without a browser.
 */

export type RingGeometry = {
  /** Angle of the leading cap in degrees, 0 at twelve o'clock. */
  capAngle: number;
  circumference: number;
  /** Whole goals completed before the current sweep. */
  laps: number;
  /** Sweep of the current lap, 0 to 1. */
  progress: number;
  radius: number;
  /** Dash offset that draws exactly `progress` of the circle. */
  strokeDashoffset: number;
};

export function getRingGeometry(value: number, radius: number): RingGeometry {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const capped = Math.min(safeValue, 999);
  const laps = capped >= 100 ? Math.floor(capped / 100) : 0;
  const remainder = capped - laps * 100;
  const progress = capped === 0 ? 0 : remainder === 0 ? 1 : remainder / 100;
  const circumference = 2 * Math.PI * radius;

  return {
    capAngle: progress * 360,
    circumference,
    laps: progress === 1 && remainder === 0 ? laps - 1 : laps,
    progress,
    radius,
    strokeDashoffset: circumference * (1 - progress),
  };
}

export function isRingClosed(value: number) {
  return Number.isFinite(value) && value >= 100;
}

export function getRingsSummary(values: number[]) {
  const active = values.filter((value) => Number.isFinite(value));
  const closed = active.filter(isRingClosed).length;
  return {
    allClosed: active.length > 0 && closed === active.length,
    closed,
    total: active.length,
  };
}
