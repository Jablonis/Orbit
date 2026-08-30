import { Skeleton } from "orbit-design-system";

/** Skeletons take their shape from className — these are the shapes Orbit uses. */
export function Shapes() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="size-12 rounded-full" />
    </div>
  );
}

/** The loading state of an overview card, before its reading arrives. */
export function LoadingCard() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </div>
    </div>
  );
}
