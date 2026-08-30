import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Progress,
} from "orbit-design-system";

/** Every slot of the card, in the order they are meant to be used. */
export function Anatomy() {
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
      <CardContent>
        <Progress value={50} />
        <p className="mt-2 text-[13px] text-muted-foreground">
          50% of the week complete
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

/** Header and content only — the shape most reading cards take. */
export function Reading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Net cashflow</CardTitle>
          <CardDescription>August, so far</CardDescription>
        </div>
        <Badge variant="finance">+€1,240</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-[28px] font-bold leading-9 tracking-[-0.02em]">
          €4,180
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Up 12% on the same point last month.
        </p>
      </CardContent>
    </Card>
  );
}
