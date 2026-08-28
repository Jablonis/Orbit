import type { PipMood } from "@/lib/mascot";
import {
  PIP_HEIGHT,
  PIP_WIDTH,
  type PipColor,
  type PipShape,
  getPipArt,
  isPipStanding,
} from "@/lib/pip-art";
import { getPipFace } from "@/lib/pip-pixels";

/**
 * Pip: a penguin in orbit.
 *
 * The bird that cannot fly, in the one place flying is the whole point — which
 * is the product in one picture: nothing about a day is impossible, it just
 * needs something under it. The helmet is the Orbit mark, so the brand and the
 * character are the same geometry.
 *
 * He is drawn on a grid (see `pip-pixels`), and animated the way a sprite is:
 * whole frames swapped on a step, never tweened. A pixel that slides is a
 * smudge, and the snap is most of what makes the idiom read as a character
 * rather than as a picture with an effect on it.
 *
 * Two frames are in the markup at once — eyes open and eyes shut — and the
 * blink is which of them is showing. That costs a few dozen rectangles and buys
 * an animation with no JavaScript, no hydration, and nothing to schedule.
 */

/**
 * Pip's own colours. His body and his belly are the character, not the surface:
 * reading them from `--foreground` and `--card` meant the moment the canvas
 * turned dark he arrived as a photo negative.
 */
const token: Record<PipColor, string> = {
  beak: "var(--warning, #E8A33D)",
  flame: "var(--tasks, #F0568C)",
  ink: "var(--pip-ink, #1B1A1F)",
  paper: "var(--pip-paper, #FFFFFF)",
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
  // A penguin on the ground breathes; one in flight drifts. Standing still and
  // hovering at the same time is what made him read as a sticker.
  const airborne = !isPipStanding(mood);
  // A face that is already shut or already delighted has nothing to blink.
  const blinks = getPipFace(mood) === "open";

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      className={`pip pip--${mood} ${className}`}
      height={size}
      role={title ? "img" : undefined}
      // Whole pixels: at a fractional scale the runs otherwise show hairline
      // seams between them, which reads as a broken drawing rather than art.
      shapeRendering="crispEdges"
      viewBox={`0 0 ${PIP_WIDTH} ${PIP_HEIGHT}`}
      width={(size * PIP_WIDTH) / PIP_HEIGHT}
    >
      {title ? <title>{title}</title> : null}
      <g
        className={`pip-idle ${airborne ? "pip-idle--fly" : "pip-idle--rest"}`}
        style={{ "--pip-seed": seed } as React.CSSProperties}
      >
        <Frame
          className={blinks ? "pip-frame pip-frame--open" : undefined}
          shapes={getPipArt(mood, burn).shapes}
        />
        {blinks ? (
          <Frame
            className="pip-frame pip-frame--shut"
            shapes={getPipArt(mood, burn, true).shapes}
          />
        ) : null}
      </g>
    </svg>
  );
}

/** One frame, with its thrust in a group of its own so it can flicker. */
function Frame({
  className,
  shapes,
}: {
  className?: string;
  shapes: PipShape[];
}) {
  const flame = shapes.filter((shape) => shape.part === "flame");
  const body = shapes.filter((shape) => shape.part !== "flame");

  return (
    <g className={className}>
      {body.map((shape, index) => (
        <Shape key={index} shape={shape} />
      ))}
      {flame.length > 0 ? (
        <g className="pip-flame">
          {flame.map((shape, index) => (
            <Shape key={index} shape={shape} />
          ))}
        </g>
      ) : null}
    </g>
  );
}

function Shape({ shape }: { shape: PipShape }) {
  const common = {
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
