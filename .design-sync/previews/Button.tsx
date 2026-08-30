import { Button } from "orbit-design-system";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Log training</Button>
      <Button variant="secondary">Save draft</Button>
      <Button variant="outline">Skip today</Button>
      <Button variant="ghost">Not now</Button>
      <Button variant="destructive">Delete streak</Button>
      <Button variant="link">View the whole week</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button aria-label="Add" size="icon">
        +
      </Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Log training</Button>
      <Button disabled variant="outline">
        Skip today
      </Button>
      <Button disabled variant="ghost">
        Not now
      </Button>
    </div>
  );
}

/**
 * The pairing Orbit's overview cards use: one filled action carrying the
 * card's intent, one outline action beside it, both sharing the width.
 */
export function CardActions() {
  return (
    <div className="flex w-full max-w-sm items-center gap-2">
      <Button className="flex-1">Start session</Button>
      <Button className="flex-1" variant="outline">
        Reschedule
      </Button>
    </div>
  );
}
