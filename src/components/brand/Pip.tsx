import type { PipMood } from "@/lib/mascot";
import {
  PIP_HEIGHT,
  PIP_WIDTH,
  type PipColor,
  type PipShape,
  getPipArt,
  isPipStanding,
} from "@/lib/pip-art";

/**
 * Pip: a penguin in orbit.
 *
 * The bird that cannot fly, in the one place flying is the whole point — which
 * is the product in one picture: nothing about a day is impossible, it just
 * needs something under it. The helmet is the Orbit mark, so the brand and the
 * character are the same geometry.
 *
 * The shapes come from `pip-art`, which the share images draw from as well, so
 * the Pip on a posted card is the same character as the Pip on the dashboard.
 * Nothing loops forever; Pip moves when something happened, and is still
 * otherwise.
 */

const token: Record<PipColor, string> = {
  beak: "var(--warning, #E8A33D)",
  flame: "var(--tasks, #F0568C)",
  ink: "var(--foreground, #1B1A1F)",
  paper: "var(--card, #FFFFFF)",
  plum: "var(--plum, #6B2FBF)",
};

export function Pip({
  burn = 0.5,
  className = "",
  mood = "cruising",
  seed = 0,
  size = 64,
  title,
}: {
  /** 0–1. How much engine is showing. */
  burn?: number;
  className?: string;
  mood?: PipMood;
  /** Offsets the idle so two Pips on one screen do not blink in unison. */
  seed?: number;
  size?: number;
  /** Given only where Pip carries meaning no neighbouring text already says. */
  title?: string;
}) {
  const art = getPipArt(mood, burn);
  // A penguin on the ground breathes; one in flight drifts. Standing still and
  // hovering at the same time is what made him read as a sticker.
  const airborne = !isPipStanding(mood);

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      className={`pip pip--${mood} ${className}`}
      height={size}
      role={title ? "img" : undefined}
      viewBox={`0 0 ${PIP_WIDTH} ${PIP_HEIGHT}`}
      width={(size * PIP_WIDTH) / PIP_HEIGHT}
    >
      {title ? <title>{title}</title> : null}
      {/* Two groups on purpose: the idle owns one transform and the lean owns
          the other, so neither has to fight the other for the property. */}
      <g
        className={`pip-idle ${airborne ? "pip-idle--fly" : "pip-idle--rest"}`}
        style={{ "--pip-seed": seed } as React.CSSProperties}
      >
        <g
          style={{
            transform: `rotate(${art.tilt}deg)`,
            transformOrigin: "36px 50px",
          }}
        >
          {art.shapes.map((shape, index) => (
            <Shape key={index} shape={shape} />
          ))}
        </g>
      </g>
    </svg>
  );
}

function Shape({ shape }: { shape: PipShape }) {
  const common = {
    className: shape.part === "eye" ? "pip-eye" : undefined,
    fill: shape.fill ? token[shape.fill] : "none",
    opacity: shape.opacity,
    stroke: shape.stroke ? token[shape.stroke] : undefined,
    strokeWidth: shape.width,
    style: shape.rotate
      ? {
          transform: `rotate(${shape.rotate.deg}deg)`,
          transformOrigin: `${shape.rotate.x}px ${shape.rotate.y}px`,
        }
      : undefined,
  };

  if (shape.kind === "circle") {
    return <circle {...common} cx={shape.cx} cy={shape.cy} r={shape.r} />;
  }
  if (shape.kind === "ellipse") {
    return (
      <ellipse {...common} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
    );
  }
  if (shape.kind === "rect") {
    return (
      <rect
        {...common}
        height={shape.height}
        rx={shape.radius}
        width={shape.width}
        x={shape.x}
        y={shape.y}
      />
    );
  }
  return (
    <path {...common} d={shape.d} strokeLinecap={shape.cap ? "round" : undefined} />
  );
}
