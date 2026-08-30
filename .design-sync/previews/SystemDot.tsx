import { SystemDot } from "orbit-design-system";

/** One dot per system: the smallest way to say which system a line belongs to. */
export function AllSystems() {
  const systems = ["tasks", "fitness", "finance", "plum"] as const;
  const labels = {
    finance: "Finance",
    fitness: "Fitness",
    plum: "Voyage",
    tasks: "Tasks",
  };

  return (
    <div className="flex flex-col gap-3">
      {systems.map((system) => (
        <p
          key={system}
          className="label-caps flex items-center gap-2 text-muted-foreground"
        >
          <SystemDot system={system} />
          {labels[system]}
        </p>
      ))}
    </div>
  );
}

/** In a legend, where the dots are read against each other. */
export function AsLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
      <span className="flex items-center gap-2">
        <SystemDot system="tasks" />3 open
      </span>
      <span className="flex items-center gap-2">
        <SystemDot system="fitness" />2 sessions
      </span>
      <span className="flex items-center gap-2">
        <SystemDot system="finance" />€1,240 left
      </span>
      <span className="flex items-center gap-2">
        <SystemDot system="plum" />1.2M km
      </span>
    </div>
  );
}
