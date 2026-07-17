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
      className="min-h-screen overflow-hidden bg-[#0d0d0e] pb-24 text-[#e5e2e1] md:pl-[112px]"
    >
      <div className="fixed left-0 top-0 hidden h-screen w-[112px] border-r border-white/10 bg-[#111112]/86 md:block" />
      <section className="mx-auto w-full max-w-[1600px] px-4 py-7 md:px-10">
        <div className="h-3 w-28 animate-pulse rounded-full bg-[#a3e635]/25 motion-reduce:animate-none" />
        <div className="mt-4 h-11 w-full max-w-lg animate-pulse rounded-[16px] bg-white/10 motion-reduce:animate-none" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
          {skeletonCardClasses.map((spanClass, index) => (
            <div
              className={`content-panel h-48 animate-pulse rounded-[24px] bg-white/[0.025] motion-reduce:animate-none sm:col-span-2 ${spanClass}`}
              key={`${spanClass}-${index}`}
            />
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </section>
    </main>
  );
}
