import { Pip } from "@/components/brand/Pip";

/**
 * What Orbit shows while it is fetching a day.
 *
 * The skeleton was honest and said nothing: six grey rectangles are what a
 * page looks like when it has no idea what is coming. Opening an app is the
 * one moment where a little character is worth the pixels — you are waiting
 * either way, and this way you are waiting on something.
 *
 * The ring turns, Pip rides it, and the whole thing is `transform` and
 * `opacity` only, so it costs nothing and holds still when the device asks for
 * less motion.
 */
export function OrbitSplash({ label = "Loading Orbit" }: { label?: string }) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="app-shell grid min-h-[100dvh] place-items-center"
      id="main-content"
      tabIndex={-1}
    >
      <span aria-hidden="true" className="route-loading-progress" />

      <div className="flex flex-col items-center gap-6">
        <div aria-hidden="true" className="orbit-splash relative h-[132px] w-[132px]">
          {/* The track, and the arc that runs round it. */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 132 132">
            <circle
              cx="66"
              cy="66"
              fill="none"
              r="52"
              stroke="var(--plum)"
              strokeOpacity="0.18"
              strokeWidth="4"
            />
            <circle
              className="orbit-splash__arc"
              cx="66"
              cy="66"
              fill="none"
              r="52"
              stroke="var(--plum)"
              strokeDasharray="82 245"
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>

          {/* Pip rides the ring: the wrapper turns, and he turns back inside it
              so he stays upright rather than tumbling. */}
          <div className="orbit-splash__carrier absolute inset-0">
            <div className="orbit-splash__rider absolute left-1/2 top-0 -translate-x-1/2">
              <Pip burn={0.9} mood="lifting" seed={0} size={44} />
            </div>
          </div>
        </div>

        <p className="label-caps text-muted-foreground">{label}</p>
      </div>
    </main>
  );
}
