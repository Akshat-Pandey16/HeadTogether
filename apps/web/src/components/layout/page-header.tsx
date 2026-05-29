import { cn } from "@/lib/utils";

export const PageHeader = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <header
    className={cn(
      "flex h-16 shrink-0 items-center gap-3 border-b-2 border-ink bg-card px-4",
      className,
    )}
  >
    {children}
  </header>
);

export const PageTitle = ({
  icon,
  title,
  subtitle,
  tint,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tint?: string;
}) => (
  <div className="flex min-w-0 items-center gap-3">
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2 border-ink text-black"
      style={{ backgroundColor: tint ?? "hsl(var(--acid))" }}
    >
      {icon}
    </span>
    <div className="min-w-0 leading-none">
      <h1 className="truncate font-display text-xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-1 hidden truncate font-mono text-[11px] text-muted-foreground sm:block">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);
