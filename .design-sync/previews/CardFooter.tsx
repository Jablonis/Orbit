import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "orbit-design-system";

/** The action row: the card's decision, at the bottom of the card. */
export function TwoActions() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Upper body</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted-foreground">
          48 minutes, scheduled for this evening.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="flex-1">Start session</Button>
        <Button className="flex-1" variant="outline">
          Reschedule
        </Button>
      </CardFooter>
    </Card>
  );
}

/** One action reads as the single obvious next step. */
export function OneAction() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Weekly review</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[13px] text-muted-foreground">
          Your week is ready to close.
        </p>
      </CardContent>
      <CardFooter>
        <Button>Open review</Button>
      </CardFooter>
    </Card>
  );
}
