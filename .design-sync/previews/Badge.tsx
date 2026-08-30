import { Badge } from "orbit-design-system";

/** Every variant. The domain tints match the panel a badge normally sits in. */
export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Muted</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="plum">Voyager</Badge>
      <Badge variant="tasks">4 open</Badge>
      <Badge variant="fitness">On track</Badge>
      <Badge variant="finance">+€1,240</Badge>
      <Badge variant="destructive">Over budget</Badge>
    </div>
  );
}

/** How badges actually read in Orbit: a short status pinned beside a heading. */
export function AsStatus() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">Upper body</p>
        <Badge variant="fitness">Complete</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">Groceries</p>
        <Badge variant="finance">€82.40</Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">Rent</p>
        <Badge variant="destructive">Due today</Badge>
      </div>
    </div>
  );
}
