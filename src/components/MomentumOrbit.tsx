import type { AltitudePoint, OrbitTier } from "@/lib/momentum";
import { ORBIT_DAY_SCORE, orbitTiers } from "@/lib/momentum";
import { getRingGeometry } from "@/lib/activity-rings";

const CENTER = 120;
const RADIUS = 88;
const STROKE = 21;
const DIAL_RADIUS = 108;
const DIAL_LENGTH = 12;
const TRACE_DAYS = 14;

function pointOn(radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

/**
 * Momentum in the same idiom as the daily rings: one ring for altitude, the
 * tier floor marked on it, and the last two weeks around the outside.
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
  // Ids must not collide when more than one orbit renders on a page.
  const gradientId = `momentum-ring-${tier.id}`;
  const geometry = getRingGeometry(altitude, RADIUS);
  const projection = getRingGeometry(projected, RADIUS);
  const trace = series.slice(-TRACE_DAYS);
  const floorAngle = (tier.floor / 100) * 360;
  const floorMark = {
    inner: pointOn(RADIUS - STROKE / 2 - 3, floorAngle),
    outer: pointOn(RADIUS + STROKE / 2 + 3, floorAngle),
  };
  const nextFloor =
    orbitTiers.find((item) => item.floor > tier.floor)?.floor ?? null;
  const nextFloorMark = nextFloor === null
    ? null
    : {
        inner: pointOn(RADIUS - STROKE / 2 - 3, (nextFloor / 100) * 360),
        outer: pointOn(RADIUS + STROKE / 2 + 3, (nextFloor / 100) * 360),
      };

  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 240 240">
      <defs>
        <linearGradient
          id={gradientId}
          gradientTransform={`rotate(${geometry.capAngle} 0.5 0.5)`}
          x1="0.5"
          x2="0.5"
          y1="1"
          y2="0"
        >
          <stop offset="0%" stopColor={tier.color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={tier.color} stopOpacity="1" />
        </linearGradient>
      </defs>

      <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
        <circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS}
          stroke={tier.color}
          strokeOpacity={0.14}
          strokeWidth={STROKE}
        />

        {projection.progress > geometry.progress ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            fill="none"
            r={RADIUS}
            stroke={tier.color}
            strokeDasharray={projection.circumference}
            strokeDashoffset={projection.strokeDashoffset}
            strokeLinecap="round"
            strokeOpacity={0.3}
            strokeWidth={STROKE}
          />
        ) : null}

        <circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS}
          stroke={`url(#${gradientId})`}
          strokeDasharray={geometry.circumference}
          strokeDashoffset={geometry.strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={STROKE}
        />
      </g>

      {/* Tier boundaries read as gate marks across the ring. */}
      <line
        stroke="var(--canvas)"
        strokeOpacity={0.85}
        strokeWidth={2}
        x1={floorMark.inner.x}
        x2={floorMark.outer.x}
        y1={floorMark.inner.y}
        y2={floorMark.outer.y}
      />
      {nextFloorMark === null ? null : (
        <line
          stroke="rgba(244, 235, 221,0.35)"
          strokeDasharray="2 3"
          strokeWidth={2}
          x1={nextFloorMark.inner.x}
          x2={nextFloorMark.outer.x}
          y1={nextFloorMark.inner.y}
          y2={nextFloorMark.outer.y}
        />
      )}

      {trace.map((point, index) => {
        const angle = (index / TRACE_DAYS) * 360;
        const scored = point.score ?? 0;
        const reached = scored >= ORBIT_DAY_SCORE;
        const length = 2 + (Math.max(0, Math.min(100, scored)) / 100) * DIAL_LENGTH;
        const start = pointOn(DIAL_RADIUS, angle);
        const end = pointOn(DIAL_RADIUS + length, angle);
        return (
          <line
            key={point.date}
            stroke={reached ? tier.color : "rgba(244, 235, 221,0.22)"}
            strokeLinecap="round"
            strokeOpacity={reached ? 0.4 + (index / TRACE_DAYS) * 0.6 : 0.7}
            strokeWidth={3}
            x1={start.x}
            x2={end.x}
            y1={start.y}
            y2={end.y}
          />
        );
      })}
    </svg>
  );
}
