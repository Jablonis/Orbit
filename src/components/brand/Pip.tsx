import type { PipMood } from "@/lib/mascot";

/**
 * Pip: the little rocket Orbit is named after.
 *
 * Drawn, not imported — one SVG that takes the account's mood, so the same
 * character appears in the dashboard, the crew, the empty states and the
 * shareable moments without a single asset to keep in sync. Nothing here loops
 * forever; Pip animates when something happened, and is still otherwise.
 */

const tilt: Record<PipMood, number> = {
  asleep: 0,
  cruising: -10,
  grounded: -3,
  lifting: -7,
  sealed: -16,
  soaring: -14,
};

export function Pip({
  burn = 0.5,
  className = "",
  mood = "cruising",
  size = 64,
  title,
}: {
  /** 0–1. How much engine is showing. */
  burn?: number;
  className?: string;
  mood?: PipMood;
  size?: number;
  /** Given only where Pip carries meaning no neighbouring text already says. */
  title?: string;
}) {
  const flame = mood === "asleep" ? 0 : Math.max(0.15, Math.min(1, burn));

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      className={`pip pip--${mood} ${className}`}
      height={size}
      role={title ? "img" : undefined}
      viewBox="0 0 72 96"
      width={(size * 72) / 96}
    >
      {title ? <title>{title}</title> : null}

      <g
        style={{
          transform: `rotate(${tilt[mood]}deg)`,
          transformOrigin: "36px 48px",
        }}
      >
        {/* Exhaust, below the nozzle so it is never hidden by the body. */}
        {flame > 0 ? (
          <g className="pip-flame">
            <path
              d={`M36 70c8 ${7 * flame} 7 ${15 * flame} 0 ${22 * flame}c-7 ${-7 * flame} -8 ${-15 * flame} 0 ${-22 * flame}Z`}
              fill="var(--warning, #E8A33D)"
              opacity="0.85"
            />
            <path
              d={`M36 70c4 ${4 * flame} 3.5 ${8 * flame} 0 ${13 * flame}c-3.5 ${-5 * flame} -4 ${-9 * flame} 0 ${-13 * flame}Z`}
              fill="var(--tasks, #F0568C)"
            />
          </g>
        ) : null}

        {/* Fins, clear of the body on both sides so the silhouette reads. */}
        <path
          d="M25 44c-8 5-12 12-12 21l12-6Z"
          fill="var(--plum, #6B2FBF)"
        />
        <path
          d="M47 44c8 5 12 12 12 21l-12-6Z"
          fill="var(--plum, #6B2FBF)"
        />

        {/* Nozzle. */}
        <path
          d="M28 62h16l3 8H25Z"
          fill="var(--foreground, #1B1A1F)"
        />

        {/* Body: one narrow shell from a pointed nose to the nozzle. */}
        <path
          d="M36 4c7 8 11 19 11 30v28H25V34C25 23 29 12 36 4Z"
          fill="var(--card, #FFFFFF)"
          stroke="var(--foreground, #1B1A1F)"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {/* Nose cone. */}
        <path
          d="M36 4c4.6 5.3 8 12.3 9.8 20H26.2C28 16.3 31.4 9.3 36 4Z"
          fill="var(--plum, #6B2FBF)"
        />

        {/* Visor and face. */}
        <circle cx="36" cy="38" fill="var(--foreground, #1B1A1F)" r="8.4" />
        <Face mood={mood} />

        {/* A rivet, so the shell is a machine rather than an egg. */}
        <circle cx="36" cy="54" fill="var(--plum, #6B2FBF)" opacity="0.4" r="2" />
      </g>
    </svg>
  );
}

/** The whole personality, in six pairs of eyes. */
function Face({ mood }: { mood: PipMood }) {
  const white = "var(--card, #FFFFFF)";

  if (mood === "asleep") {
    return (
      <g fill="none" stroke={white} strokeLinecap="round" strokeWidth="1.9">
        <path d="M31.4 38.4c.9-1.5 2.6-1.5 3.5 0" />
        <path d="M37.1 38.4c.9-1.5 2.6-1.5 3.5 0" />
      </g>
    );
  }

  if (mood === "soaring" || mood === "sealed") {
    return (
      <>
        <g fill="none" stroke={white} strokeLinecap="round" strokeWidth="1.9">
          <path d="M31.2 37c.9-1.6 2.6-1.6 3.5 0" />
          <path d="M37.3 37c.9-1.6 2.6-1.6 3.5 0" />
        </g>
        <path
          d="M33 40.6c1.4 1.6 4.6 1.6 6 0"
          fill="none"
          stroke={white}
          strokeLinecap="round"
          strokeWidth="1.9"
        />
        {mood === "sealed" ? (
          <g fill="var(--warning, #E8A33D)">
            <path d="M57 20l1.3 3.2 3.2 1.3-3.2 1.3L57 29l-1.3-3.2-3.2-1.3 3.2-1.3Z" />
            <path d="M13 30l1 2.4 2.4 1-2.4 1L13 36.8l-1-2.4-2.4-1 2.4-1Z" />
          </g>
        ) : null}
      </>
    );
  }

  const wide = mood === "lifting";
  return (
    <>
      <circle cx="32.8" cy="37" fill={white} r={wide ? 2.2 : 1.8} />
      <circle cx="39.2" cy="37" fill={white} r={wide ? 2.2 : 1.8} />
      <path
        d={mood === "grounded" ? "M33 41.4h6" : "M33 41c1.3 1.3 4.7 1.3 6 0"}
        fill="none"
        stroke={white}
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </>
  );
}
