import { Input, Label, Textarea } from "orbit-design-system";

/**
 * Label is a Radix label: it only means anything bound to a control, so every
 * cell shows it doing its job rather than floating alone.
 */
export function FieldLabels() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="amount">Amount</Label>
        <Input defaultValue="82.40" id="amount" type="number" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note</Label>
        <Textarea defaultValue="Weekly shop" id="note" rows={2} />
      </div>
    </div>
  );
}

/** Labels sit inline with a checkbox, keeping the 8px gap the component sets. */
export function WithCheckbox() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Label htmlFor="repeat">
        <input defaultChecked id="repeat" type="checkbox" />
        Repeat every week
      </Label>
      <Label htmlFor="remind">
        <input id="remind" type="checkbox" />
        Remind me the evening before
      </Label>
    </div>
  );
}
