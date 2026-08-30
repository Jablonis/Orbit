import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "orbit-design-system";

/** The body slot: whatever the card is actually reporting. */
export function AReading() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Net cashflow</CardTitle>
          <CardDescription>August, so far</CardDescription>
        </div>
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

/** Content also carries progress and lists, not only figures. */
export function AProgressBlock() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>This week&rsquo;s training</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={50} />
        <p className="mt-2 text-[13px] text-muted-foreground">
          Two of four sessions done
        </p>
      </CardContent>
    </Card>
  );
}
