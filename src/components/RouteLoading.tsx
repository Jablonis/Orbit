const skeletonCardClasses = [
  "xl:col-span-6",
  "xl:col-span-3",
  "xl:col-span-3",
  "xl:col-span-5",
  "xl:col-span-7",
  "xl:col-span-12",
] as const;

import { Pip } from "@/components/brand/Pip";

export function RouteLoading({ label = "Loading Orbit" }: { label?: string }) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      className="app-shell overflow-hidden"
      id="main-content"
      tabIndex={-1}
    >
      <span aria-hidden="true" className="route-loading-progress" />
      <div className="fixed left-0 top-0 hidden h-screen w-[112px] border-r border-[var(--hairline)] bg-card/86 md:block" />
      <section className="page-container py-7">
        {/* The skeleton says what shape is coming; Pip says something is
            coming at all. A grey page with no sign of life reads as broken
            long before it reads as slow. */}
        <div className="flex items-center gap-3">
          <Pip
            burn={0.9}
            className="route-loading-pip h-9 w-auto shrink-0"
            mood="lifting"
            seed={0}
            size={36}
          />
          <p className="label-caps text-muted-foreground">{label}</p>
        </div>
        <div className="skeleton-shimmer mt-6 h-11 w-full max-w-lg rounded-xl bg-[var(--hairline)]" />
        <div className="skeleton-shimmer mt-3 h-4 w-full max-w-2xl rounded-full bg-[var(--wash)]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
          {skeletonCardClasses.map((spanClass, index) => (
            <div
              className={`rounded-2xl bg-card shadow-[var(--shadow-card)] skeleton-shimmer h-48 rounded-2xl bg-[var(--wash)] sm:col-span-2 ${spanClass}`}
              key={`${spanClass}-${index}`}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
