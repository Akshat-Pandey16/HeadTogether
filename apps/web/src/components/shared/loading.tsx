import { Loader2 } from "lucide-react";

export const LoadingPage = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3">
    <div className="flex h-12 w-12 items-center justify-center rounded-sm border-2 border-ink bg-card shadow-brutal-sm">
      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
    </div>
    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
  </div>
);

export const LoadingInline = () => <Loader2 className="h-4 w-4 animate-spin" />;
