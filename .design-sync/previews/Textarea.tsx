import { Label, Textarea } from "orbit-design-system";

/** The weekly reflection field, which is where Orbit uses a textarea. */
export function WithLabel() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Label htmlFor="reflection">What went well this week?</Label>
      <Textarea
        defaultValue={
          "Three training sessions instead of two, and I finally closed the tax folder."
        }
        id="reflection"
        name="reflection"
        rows={4}
      />
    </div>
  );
}

export function States() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Textarea placeholder="Anything worth remembering?" rows={3} />
      <Textarea disabled defaultValue="Locked while syncing" rows={2} />
    </div>
  );
}
