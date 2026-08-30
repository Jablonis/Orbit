import { Separator } from "orbit-design-system";

/** Horizontal: the rule between rows of a list. */
export function BetweenRows() {
  const rows = [
    { meta: "08:30", title: "Draft the quarterly review" },
    { meta: "11:00", title: "Climbing session" },
    { meta: "16:15", title: "Call the accountant" },
  ];

  return (
    <div className="flex w-full max-w-sm flex-col">
      {rows.map((row, index) => (
        <div key={row.title}>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-[15px] font-semibold">{row.title}</span>
            <span className="text-[13px] text-muted-foreground">
              {row.meta}
            </span>
          </div>
          {index < rows.length - 1 ? <Separator /> : null}
        </div>
      ))}
    </div>
  );
}

/** Vertical: the divider between inline metadata. */
export function BetweenMeta() {
  return (
    <div className="flex h-5 items-center gap-3 text-[13px] text-muted-foreground">
      <span>48 minutes</span>
      <Separator orientation="vertical" />
      <span>Upper body</span>
      <Separator orientation="vertical" />
      <span>Logged today</span>
    </div>
  );
}
