import { cn } from "@/lib/utils";

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("animate-pulse rounded-sm border-2 border-border bg-muted", className)}
    {...props}
  />
);
