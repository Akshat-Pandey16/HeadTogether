import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, setTheme } = useTheme();
  return (
    <div className={cn("inline-flex rounded-sm border-2 border-ink", className)}>
      {OPTIONS.map((opt, i) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-label={opt.label}
            title={opt.label}
            className={cn(
              "flex h-7 w-8 items-center justify-center transition",
              i > 0 && "border-l-2 border-ink",
              active ? "bg-acid text-acid-foreground" : "bg-card text-muted-foreground hover:bg-secondary",
            )}
          >
            <opt.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        );
      })}
    </div>
  );
};
