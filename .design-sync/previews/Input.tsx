import { Input, Label } from "orbit-design-system";

/** The field as it is normally used: a Label bound to the Input above it. */
export function WithLabel() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Label htmlFor="task-title">Task</Label>
      <Input
        defaultValue="Draft the quarterly review"
        id="task-title"
        name="task-title"
      />
    </div>
  );
}

/** Empty, filled, disabled and invalid — the states that render statically. */
export function States() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Input placeholder="What needs doing?" />
      <Input defaultValue="Book the climbing gym" />
      <Input disabled defaultValue="Locked while syncing" />
      <Input aria-invalid defaultValue="not-an-email" />
    </div>
  );
}

/** Typed inputs keep the same shell, so a form reads as one column. */
export function Types() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Input placeholder="you@example.com" type="email" />
      <Input defaultValue="2026-08-30" type="date" />
      <Input defaultValue="45" type="number" />
    </div>
  );
}
