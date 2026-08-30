import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "orbit-design-system";

/** The muted line under a title: 13px, secondary colour, never the point. */
export function InCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Weekly review</CardTitle>
          <CardDescription>
            Ten minutes on a Sunday evening, so Monday starts already decided.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

/** Short descriptions carry a reading's timeframe rather than a sentence. */
export function AsTimeframe() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Distance travelled</CardTitle>
          <CardDescription>Since 1 January</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
