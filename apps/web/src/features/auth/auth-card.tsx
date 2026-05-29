import { ThemeToggle } from "@/components/shared/theme-toggle";

type Props = {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

const MARQUEE = ["PLAY", "MOVIE", "TRAVEL", "CHAT", "LANDMARK", "MEETUP", "RUN", "STUDY"];

export const AuthCard = ({ title, description, children, footer }: Props) => (
  <div className="grid h-full w-full lg:grid-cols-[1.1fr_1fr]">
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r-2 border-ink bg-acid p-10 text-acid-foreground lg:flex">
      <div className="grain absolute inset-0 opacity-40" />
      <div className="relative flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-sm border-2 border-ink bg-card font-display text-sm font-extrabold text-foreground">
          HT
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-widest">HeadTogether</span>
      </div>

      <div className="relative">
        <h2 className="font-display text-6xl font-extrabold leading-[0.95] tracking-tighter xl:text-7xl">
          ROOMS
          <br />
          THAT ONLY
          <br />
          EXIST
          <br />
          <span className="bg-ink px-2 text-background">WHERE</span> YOU ARE.
        </h2>
        <p className="mt-6 max-w-sm font-mono text-sm">
          Drop a room at your exact spot. Only people inside the radius can find it, join it, and
          talk in it. When you leave, the moment closes.
        </p>
      </div>

      <div className="relative overflow-hidden border-y-2 border-ink py-2">
        <div className="marquee-track flex w-max gap-3 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((word, i) => (
            <span key={i} className="font-mono text-xs font-bold uppercase tracking-widest">
              {word} <span className="opacity-50">/</span>
            </span>
          ))}
        </div>
      </div>
    </aside>

    <main className="relative flex min-h-full items-center justify-center overflow-y-auto bg-background p-6 sm:p-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm border-2 border-ink bg-acid font-display text-sm font-extrabold text-acid-foreground">
            HT
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">HeadTogether</span>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  </div>
);
