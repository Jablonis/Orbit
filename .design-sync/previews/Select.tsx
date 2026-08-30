import { Label, Select } from "orbit-design-system";

/** A native select in the Orbit field shell, bound to its Label. */
export function WithLabel() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Label htmlFor="session-type">Session type</Label>
      <Select defaultValue="upper" id="session-type" name="session-type">
        <option value="upper">Upper body</option>
        <option value="lower">Lower body</option>
        <option value="cardio">Cardio</option>
        <option value="rest">Rest day</option>
      </Select>
    </div>
  );
}

export function States() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Select defaultValue="week">
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="year">This year</option>
      </Select>
      <Select disabled defaultValue="locked">
        <option value="locked">Locked while syncing</option>
      </Select>
    </div>
  );
}
