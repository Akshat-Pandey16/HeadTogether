import { Loader2 } from "lucide-react";

export const LoadingPage = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
    <span className="text-sm">{label}</span>
  </div>
);

export const LoadingInline = () => <Loader2 className="h-4 w-4 animate-spin" />;
