"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex items-center gap-2 text-[13px] font-semibold leading-none text-foreground select-none group-data-[disabled=true]:opacity-50",
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
