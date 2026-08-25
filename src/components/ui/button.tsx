import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] font-semibold outline-none transition-[background-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/35 active:scale-[0.985] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        icon: "size-11",
        lg: "h-12 px-7 text-sm",
        sm: "h-9 px-4 text-[12px]",
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "h-auto rounded-sm px-0 text-primary underline-offset-4 hover:underline",
        outline:
          "border border-input bg-card text-foreground hover:border-primary/35 hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
    },
  },
);

function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
