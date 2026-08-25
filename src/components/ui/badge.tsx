import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold [&>svg]:size-3",
  {
    defaultVariants: { variant: "muted" },
    variants: {
      variant: {
        destructive: "bg-destructive/10 text-destructive",
        finance: "bg-finance-tint text-finance-ink",
        fitness: "bg-fitness-tint text-fitness-ink",
        muted: "bg-muted text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        plum: "bg-plum-tint text-plum-ink",
        tasks: "bg-tasks-tint text-tasks-ink",
      },
    },
  },
);

function Badge({
  asChild = false,
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      className={cn(badgeVariants({ className, variant }))}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
