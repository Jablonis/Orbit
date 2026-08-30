import { Badge, SystemDot, TintPanel } from "orbit-design-system";

/**
 * The container of the v2 system: colour says which system you are looking at,
 * so the panel needs no border. One panel per domain.
 */
export function Systems() {
  const systems = [
    { body: "Three of five closed today.", label: "Tasks", system: "tasks" },
    { body: "Upper body, 48 minutes.", label: "Fitness", system: "fitness" },
    { body: "€1,240 left this month.", label: "Finance", system: "finance" },
    { body: "You are past the Moon.", label: "Voyage", system: "plum" },
  ] as const;

  return (
    <div className="grid w-full grid-cols-2 gap-3">
      {systems.map((entry) => (
        <TintPanel key={entry.label} padding="sm" system={entry.system}>
          <p className="label-caps flex items-center gap-2 text-muted-foreground">
            <SystemDot system={entry.system} />
            {entry.label}
          </p>
          <p className="mt-2 text-[15px] font-semibold leading-6">
            {entry.body}
          </p>
        </TintPanel>
      ))}
    </div>
  );
}

/** Neutral is the default: a plain card surface for anything not domain-specific. */
export function NeutralAndQuiet() {
  return (
    <div className="grid w-full grid-cols-2 gap-3">
      <TintPanel padding="sm" system="neutral">
        <p className="label-caps text-muted-foreground">Neutral</p>
        <p className="mt-2 text-[15px] font-semibold leading-6">
          The default surface, with a card shadow.
        </p>
      </TintPanel>
      <TintPanel padding="sm" system="quiet">
        <p className="label-caps text-muted-foreground">Quiet</p>
        <p className="mt-2 text-[15px] font-semibold leading-6">
          A step back, for context that is not the point.
        </p>
      </TintPanel>
    </div>
  );
}

/** A full panel as the overview renders it: heading, a reading, one badge. */
export function AsOverviewCard() {
  return (
    <TintPanel className="flex w-full max-w-md flex-col gap-5" system="quiet">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-muted-foreground">Voyage</p>
          <p className="mt-1.5 text-[20px] font-bold leading-7 tracking-[-0.02em]">
            Halfway to Mars
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            384,400 km still to go before the next arrival.
          </p>
        </div>
        <Badge className="shrink-0" variant="plum">
          1.2M km
        </Badge>
      </div>
    </TintPanel>
  );
}
