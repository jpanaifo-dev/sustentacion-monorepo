import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-[#091E3A] bg-[#091E3A] text-white",
        secondary: "border-slate-300 bg-slate-100 text-slate-800",
        destructive: "border-rose-600 bg-rose-600 text-white",
        outline: "border-slate-300 text-foreground",
        confirmed: "border-emerald-600/70 bg-emerald-50 text-emerald-950 font-medium",
        draft: "border-amber-600/70 bg-amber-50 text-amber-950 font-medium",
        rescheduled: "border-blue-600/70 bg-blue-50 text-blue-950 font-medium",
        completed: "border-purple-600/70 bg-purple-50 text-purple-950 font-medium",
        cancelled: "border-rose-600/70 bg-rose-50 text-rose-950 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
