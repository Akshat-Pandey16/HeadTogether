import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border-2 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide leading-none",
  {
    variants: {
      variant: {
        default: "border-ink bg-primary text-primary-foreground",
        acid: "border-ink bg-acid text-acid-foreground",
        secondary: "border-ink bg-secondary text-secondary-foreground",
        outline: "border-ink bg-transparent text-foreground",
        destructive: "border-ink bg-destructive text-destructive-foreground",
        ghost: "border-transparent bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { badgeVariants };
