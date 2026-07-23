const skeletonCardClasses = [
  "xl:col-span-6",
  "xl:col-span-3",
  "xl:col-span-3",
  "xl:col-span-5",
  "xl:col-span-7",
  "xl:col-span-12",
] as const;

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
      <div className="fixed left-0 top-0 hidden h-screen w-[112px] border-r border-white/10 bg-[var(--surface-nav)]/86 md:block" />
      <section className="page-container py-7">
        <div className="skeleton-shimmer h-3 w-28 rounded-full bg-[var(--accent-primary)]/20" />
        <div className="skeleton-shimmer mt-4 h-11 w-full max-w-lg rounded-[16px] bg-white/10" />
        <div className="skeleton-shimmer mt-3 h-4 w-full max-w-2xl rounded-full bg-white/[0.06]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
          {skeletonCardClasses.map((spanClass, index) => (
            <div
              className={`content-panel skeleton-shimmer h-48 rounded-[24px] bg-white/[0.025] sm:col-span-2 ${spanClass}`}
              key={`${spanClass}-${index}`}
            />
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </section>
    </main>
  );
}
