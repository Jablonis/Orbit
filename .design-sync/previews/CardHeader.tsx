import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "orbit-design-system";

/**
 * CardHeader only means anything inside a Card: it is the row that holds the
 * title block on the left and one status on the right.
 */
export function InCard() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>This week&rsquo;s training</CardTitle>
          <CardDescription>
            Four sessions planned, two already behind you.
          </CardDescription>
        </div>
        <Badge variant="fitness">On track</Badge>
      </CardHeader>
    </Card>
  );
}

/** Without a trailing element the title block simply takes the full width. */
export function TitleOnly() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Weekly review</CardTitle>
          <CardDescription>Sunday evening, ten minutes.</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}
