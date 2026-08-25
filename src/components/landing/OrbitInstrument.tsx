type RingSpec = {
  color: string;
  depth: number;
  radius: number;
  system: string;
  track: string;
  value: number;
};

const rings: RingSpec[] = [
  {
    color: "var(--tasks)",
    depth: 44,
    radius: 128,
    system: "Tasks",
    track: "var(--tasks-tint)",
    value: 72,
  },
  {
    color: "var(--fitness)",
    depth: 22,
    radius: 96,
    system: "Fitness",
    track: "var(--fitness-tint)",
    value: 100,
  },
  {
    color: "var(--finance)",
    depth: 0,
    radius: 64,
    system: "Finance",
    track: "var(--finance-tint)",
    value: 100,
  },
];

const STROKE = 26;

/**
 * The landing's one piece of theatre: the three rings held apart in space,
 * turning towards the reader and filling as the page scrolls. Built from CSS
 * 3D and scroll-driven animation — no library, and it degrades to a still
 * arrangement wherever either is unsupported or motion is reduced.
 */
export function OrbitInstrument() {
  return (
    <div aria-hidden="true" className="instrument-scene">
      <div className="instrument-stack">
        {rings.map((ring) => {
          const circumference = 2 * Math.PI * ring.radius;
          const size = (ring.radius + STROKE) * 2;
          return (
            <div
              className="instrument-plane"
              key={ring.system}
              style={{ transform: `translateZ(${ring.depth}px)` }}
            >
              <svg
                className="instrument-ring"
                height={size}
                style={
                  {
                    "--arc": `${circumference}`,
                    "--arc-end": `${circumference * (1 - ring.value / 100)}`,
                  } as React.CSSProperties
                }
                viewBox={`0 0 ${size} ${size}`}
                width={size}
              >
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  fill="none"
                  r={ring.radius}
                  stroke={ring.track}
                  strokeWidth={STROKE}
                />
                <circle
                  className="instrument-arc"
                  cx={size / 2}
                  cy={size / 2}
                  fill="none"
                  r={ring.radius}
                  stroke={ring.color}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - ring.value / 100)}
                  strokeLinecap="round"
                  strokeWidth={STROKE}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </svg>
            </div>
          );
        })}

        <div className="instrument-plane" style={{ transform: "translateZ(96px)" }}>
          <div className="instrument-chip">
            <span className="label-caps text-muted-foreground">Altitude</span>
            <span className="metric-value text-[34px] font-bold leading-none">
              62
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
