import { cn } from "@/lib/utils";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export const EmptyState = ({ icon, title, description, action, className }: Props) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-4 rounded-sm border-2 border-dashed border-border p-10 text-center",
      className,
    )}
  >
    {icon && (
      <div className="flex h-14 w-14 items-center justify-center rounded-sm border-2 border-ink bg-secondary text-foreground">
        {icon}
      </div>
    )}
    <div className="space-y-1">
      <p className="font-display text-lg font-bold">{title}</p>
      {description && (
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {action}
  </div>
);
