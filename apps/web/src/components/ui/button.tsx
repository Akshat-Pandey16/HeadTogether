import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm font-mono text-xs font-bold uppercase tracking-wide transition-[transform,box-shadow,background-color,color] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-2 border-ink bg-primary text-primary-foreground shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none",
        acid: "border-2 border-ink bg-acid text-acid-foreground shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none",
        destructive:
          "border-2 border-ink bg-destructive text-destructive-foreground shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none",
        outline:
          "border-2 border-ink bg-card text-foreground hover:bg-secondary active:translate-x-px active:translate-y-px",
        secondary: "border-2 border-transparent bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "border-2 border-transparent hover:border-ink hover:bg-secondary",
        link: "h-auto p-0 text-foreground underline decoration-2 underline-offset-4 hover:text-acid",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-12 px-6 text-sm",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
