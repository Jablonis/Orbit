import type { PipMood } from "@/lib/mascot";

/**
 * Pip: a penguin in orbit.
 *
 * The bird that cannot fly, in the one place flying is the whole point —
 * which is the product in one picture: nothing about a day is impossible, it
 * just needs something under it. The helmet is the Orbit mark, so the brand and
 * the character are the same geometry.
 *
 * Drawn, not imported: one SVG that takes the account's mood, so the same
 * character appears in the dashboard, the crew, the empty states and the
 * shareable moments without an asset to keep in sync. Nothing loops forever;
 * Pip moves when something happened, and is still otherwise.
 */

const tilt: Record<PipMood, number> = {
  asleep: 0,
  cruising: -10,
  grounded: -2,
  lifting: -6,
  sealed: -15,
  soaring: -13,
};

/** Feet are for standing. In flight they are tucked away. */
const standing: Record<PipMood, boolean> = {
  asleep: true,
  cruising: false,
  grounded: true,
  lifting: false,
  sealed: false,
  soaring: false,
};

const flipper: Record<PipMood, number> = {
  asleep: 0,
  cruising: 26,
  grounded: 4,
  lifting: 16,
  sealed: 38,
  soaring: 34,
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
  // On the ground the engine is off; the flame is what leaving looks like.
  const flame = standing[mood] ? 0 : Math.max(0.15, Math.min(1, burn));
  const ink = "var(--foreground, #1B1A1F)";
  const white = "var(--card, #FFFFFF)";
  const beak = "var(--warning, #E8A33D)";
  const plum = "var(--plum, #6B2FBF)";
  const swept = flipper[mood];

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      className={`pip pip--${mood} ${className}`}
      height={size}
      role={title ? "img" : undefined}
      viewBox="0 0 72 104"
      width={(size * 72) / 104}
    >
      {title ? <title>{title}</title> : null}

      <g style={{ transform: `rotate(${tilt[mood]}deg)`, transformOrigin: "36px 50px" }}>
        {/* Thrust, below everything it could hide behind. */}
        {flame > 0 ? (
          <g className="pip-flame">
            <path
              d={`M36 82c7 ${7 * flame} 6 ${15 * flame} 0 ${21 * flame}c-6 ${-6 * flame} -7 ${-14 * flame} 0 ${-21 * flame}Z`}
              fill={beak}
              opacity="0.85"
            />
            <path
              d={`M36 82c3.5 ${4 * flame} 3 ${8 * flame} 0 ${12 * flame}c-3 ${-4 * flame} -3.5 ${-8 * flame} 0 ${-12 * flame}Z`}
              fill="var(--tasks, #F0568C)"
            />
          </g>
        ) : null}

        {/* Feet, or the pack they tuck up against. */}
        {standing[mood] ? (
          <g fill={beak}>
            <path d="M30 76c-6 2-8 6-7 9h11v-9Z" />
            <path d="M42 76c6 2 8 6 7 9H38v-9Z" />
          </g>
        ) : (
          <path d="M28 74h16a4 4 0 0 1 4 4v4H24v-4a4 4 0 0 1 4-4Z" fill={plum} />
        )}

        {/* Flippers, swept back the faster the day is going. */}
        <path
          d="M18 48c-5 5-7 13-5 20l8-8Z"
          fill={ink}
          style={{ transform: `rotate(${swept}deg)`, transformOrigin: "19px 49px" }}
        />
        <path
          d="M54 48c5 5 7 13 5 20l-8-8Z"
          fill={ink}
          style={{ transform: `rotate(${-swept}deg)`, transformOrigin: "53px 49px" }}
        />

        {/* One shell: head and body, the way a penguin is actually shaped. */}
        <path
          d="M36 12c13 0 21 13 21 32 0 21-9 34-21 34s-21-13-21-34c0-19 8-32 21-32Z"
          fill={ink}
        />

        {/* The white front. */}
        <ellipse cx="36" cy="54" fill={white} rx="14" ry="21" />
        <ellipse cx="36" cy="36" fill={white} rx="13.5" ry="12" />

        <Face beak={beak} ink={ink} mood={mood} />

        {/* The helmet: the Orbit ring, worn. The collar closes it, so the ring
            reads as glass over the head rather than a line through the body. */}
        <circle cx="36" cy="34" fill={plum} opacity="0.08" r="22" />
        <circle
          cx="36"
          cy="34"
          fill="none"
          opacity="0.5"
          r="22"
          stroke={plum}
          strokeWidth="2.5"
        />
        <path
          d="M21 22a21 21 0 0 1 11-7"
          fill="none"
          opacity="0.75"
          stroke={white}
          strokeLinecap="round"
          strokeWidth="3"
        />
        <rect
          fill={plum}
          height="7"
          opacity="0.75"
          rx="3.5"
          width="38"
          x="17"
          y="50"
        />

        {mood === "sealed" ? (
          <g fill={beak}>
            <path d="M63 16l1.3 3.2 3.2 1.3-3.2 1.3L63 25l-1.3-3.2-3.2-1.3 3.2-1.3Z" />
            <path d="M8 30l1 2.4 2.4 1-2.4 1L8 36.8l-1-2.4L4.6 33.4l2.4-1Z" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}

/** The whole personality: two eyes and a beak. */
function Face({
  beak,
  ink,
  mood,
}: {
  beak: string;
  ink: string;
  mood: PipMood;
}) {
  const happy = mood === "soaring" || mood === "sealed";

  return (
    <>
      {mood === "asleep" ? (
        <g fill="none" stroke={ink} strokeLinecap="round" strokeWidth="2.2">
          <path d="M26 34c1.4-2 4-2 5.4 0" />
          <path d="M40.6 34c1.4-2 4-2 5.4 0" />
        </g>
      ) : happy ? (
        <g fill="none" stroke={ink} strokeLinecap="round" strokeWidth="2.2">
          <path d="M26 35c1.4-2.4 4-2.4 5.4 0" />
          <path d="M40.6 35c1.4-2.4 4-2.4 5.4 0" />
        </g>
      ) : (
        <>
          <circle cx="29" cy="34" fill={ink} r={mood === "lifting" ? 3.4 : 3} />
          <circle cx="43" cy="34" fill={ink} r={mood === "lifting" ? 3.4 : 3} />
          <circle cx="30.1" cy="32.9" fill="var(--card, #FFFFFF)" r="1" />
          <circle cx="44.1" cy="32.9" fill="var(--card, #FFFFFF)" r="1" />
        </>
      )}

      {/* The beak. Open when the day is going well. */}
      {happy ? (
        <path d="M30 42h12l-6 9Z" fill={beak} />
      ) : (
        <path d="M30 41h12l-6 6Z" fill={beak} />
      )}
    </>
  );
}
