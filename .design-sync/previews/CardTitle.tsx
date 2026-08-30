import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "orbit-design-system";

/** The card's one heading: 17px semibold, tightened tracking. */
export function InCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Net cashflow</CardTitle>
          <CardDescription>August, so far</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

/** Titles stay one line where they can, and wrap without losing the leading. */
export function LongTitle() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>
            Everything you moved, spent and trained for this week
          </CardTitle>
          <CardDescription>A longer heading, wrapped.</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
