import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 file:h-full file:border-0 file:bg-transparent file:text-[13px] file:font-medium",
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition-[color,box-shadow,border-color] focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-slot="select"
      {...props}
    />
  );
}

export { Input, Select, Textarea };
