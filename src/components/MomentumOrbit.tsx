import type { AltitudePoint, OrbitTier } from "@/lib/momentum";
import { ORBIT_DAY_SCORE, orbitTiers } from "@/lib/momentum";

const CENTER = 120;
const CORE_RADIUS = 30;
const MIN_RADIUS = 42;
const MAX_RADIUS = 96;
const DIAL_RADIUS = 104;
const DIAL_LENGTH = 14;
const TRACE_DAYS = 14;

function radiusFor(altitude: number) {
  const value = Math.max(0, Math.min(100, altitude));
  return MIN_RADIUS + (value / 100) * (MAX_RADIUS - MIN_RADIUS);
}

function pointOn(radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

/**
 * The signature Orbit visual. The ring is the current altitude, the dashed ring
 * is where today is taking it, the inner dashed ring is the tier floor you are
 * trying not to fall through, and the outer dial is the last two weeks.
 */
export function MomentumOrbit({
  altitude,
  projected,
  series,
  tier,
}: {
  altitude: number;
  projected: number;
  series: AltitudePoint[];
  tier: OrbitTier;
}) {
  const orbitRadius = radiusFor(altitude);
  const orbitCircumference = 2 * Math.PI * orbitRadius;
  const projectedRadius = radiusFor(projected);
  const floorRadius = radiusFor(tier.floor);
  const trace = series.slice(-TRACE_DAYS);
  const satellite = pointOn(projectedRadius, 312);
  const nextFloor =
    orbitTiers.find((item) => item.floor > tier.floor)?.floor ?? null;

  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 240 240">
      <defs>
        <radialGradient id="momentum-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tier.color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tier.color} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CENTER} cy={CENTER} fill="url(#momentum-core)" r={MAX_RADIUS} />

      <circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={DIAL_RADIUS}
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={1}
      />

      {trace.map((point, index) => {
        const angle = (index / TRACE_DAYS) * 360;
        const scored = point.score ?? 0;
        const reached = scored >= ORBIT_DAY_SCORE;
        const length = 3 + (Math.max(0, Math.min(100, scored)) / 100) * DIAL_LENGTH;
        const start = pointOn(DIAL_RADIUS, angle);
        const end = pointOn(DIAL_RADIUS + length, angle);
        return (
          <line
            key={point.date}
            stroke={reached ? tier.color : "rgba(255,255,255,0.24)"}
            strokeLinecap="round"
            strokeOpacity={reached ? 0.35 + (index / TRACE_DAYS) * 0.65 : 0.75}
            strokeWidth={3}
            x1={start.x}
            x2={end.x}
            y1={start.y}
            y2={end.y}
          />
        );
      })}

      {nextFloor === null ? null : (
        <circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={radiusFor(nextFloor)}
          stroke="rgba(255,255,255,0.07)"
          strokeDasharray="1 7"
          strokeWidth={1}
        />
      )}

      <circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={floorRadius}
        stroke={tier.color}
        strokeDasharray="2 7"
        strokeOpacity={0.3}
        strokeWidth={1}
      />

      <circle
        cx={CENTER}
        cy={CENTER}
        fill="var(--surface-1)"
        r={CORE_RADIUS}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}
      />

      <circle
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={orbitRadius}
        stroke={tier.color}
        strokeOpacity={0.24}
        strokeWidth={1.5}
      />
      <circle
        className="momentum-orbit-path"
        cx={CENTER}
        cy={CENTER}
        fill="none"
        r={orbitRadius}
        stroke={tier.color}
        strokeDasharray={`${orbitCircumference * 0.18} ${orbitCircumference}`}
        strokeLinecap="round"
        strokeOpacity={0.9}
        strokeWidth={2}
      />

      {Math.abs(projectedRadius - orbitRadius) < 0.5 ? null : (
        <circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={projectedRadius}
          stroke={tier.color}
          strokeDasharray="3 5"
          strokeOpacity={0.5}
          strokeWidth={1.5}
        />
      )}

      <g className="momentum-satellite">
        <circle
          cx={satellite.x}
          cy={satellite.y}
          fill={tier.color}
          fillOpacity={0.18}
          r={9}
        />
        <circle cx={satellite.x} cy={satellite.y} fill={tier.color} r={4} />
      </g>
    </svg>
  );
}
