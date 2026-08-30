import { Progress } from "orbit-design-system";

/** The bar at a range of values, so the fill and the track are both legible. */
export function Values() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {[0, 25, 60, 100].map((value) => (
        <div key={value}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label-caps text-muted-foreground">
              {value}% complete
            </span>
          </div>
          <Progress value={value} />
        </div>
      ))}
    </div>
  );
}

/** indicatorClassName tints the fill to the system the reading belongs to. */
export function PerSystem() {
  const rows = [
    { fill: "bg-fitness-ink", label: "Training", value: 75 },
    { fill: "bg-finance-ink", label: "Budget used", value: 48 },
    { fill: "bg-tasks-ink", label: "Tasks closed", value: 62 },
  ];

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label-caps text-muted-foreground">
              {row.label}
            </span>
            <span className="text-[13px] font-semibold">{row.value}%</span>
          </div>
          <Progress indicatorClassName={row.fill} value={row.value} />
        </div>
      ))}
    </div>
  );
}
