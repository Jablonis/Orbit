type MarkProps = {
  className?: string;
  size?: number;
};

/**
 * The Orbit mark: a body on a ring, drawn with the same geometry as the
 * activity rings so the brand and the product read as one thing.
 */
export function OrbitMark({ className = "", size = 32 }: MarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <circle
        cx="16"
        cy="16"
        fill="none"
        r="12"
        stroke="currentColor"
        strokeOpacity="0.32"
        strokeWidth="2.5"
      />
      <path
        d="M16 4a12 12 0 0 1 11.3 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <circle cx="16" cy="16" fill="currentColor" r="5" />
      <circle cx="16" cy="4" fill="currentColor" r="2.6" />
    </svg>
  );
}

/**
 * Mark plus name. Used wherever Orbit introduces itself: navigation, the sign
 * in screen, the landing page, and the shared day card.
 */
export function OrbitWordmark({
  className = "",
  size = 28,
  tone = "accent",
}: MarkProps & { tone?: "accent" | "mono" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <OrbitMark
        className={tone === "accent" ? "text-primary" : "text-foreground"}
        size={size}
      />
      <span
        className="font-bold uppercase text-foreground"
        style={{
          fontSize: size * 0.62,
          fontStretch: "115%",
          letterSpacing: "0.06em",
        }}
      >
        Orbit
      </span>
    </span>
  );
}
