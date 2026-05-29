import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, Compass, LogOut, MessageSquare, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useUnreadCount } from "@/features/notifications/notifications-queries";
import { useAuth, useAuthActions } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/dms", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

export const MobileTopBar = () => {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-ink bg-card px-4 md:hidden">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-ink bg-acid font-display text-xs font-extrabold text-acid-foreground">
          HT
        </span>
        <span className="font-display text-base font-extrabold tracking-tight">HeadTogether</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button>
                <UserAvatar user={user} className="h-9 w-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/users/${user.id}`)}>
                <UserRound className="h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <UserRound className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export const MobileBottomNav = () => {
  const unread = useUnreadCount();
  return (
    <nav className="grid shrink-0 grid-cols-3 border-t-2 border-ink bg-card md:hidden">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            cn(
              "relative flex flex-col items-center justify-center gap-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wide transition",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )
          }
        >
          <l.icon className="h-5 w-5" strokeWidth={2.25} />
          {l.label}
          {l.to === "/notifications" && (unread.data?.count ?? 0) > 0 ? (
            <span className="absolute right-1/4 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-ink bg-destructive px-1 font-mono text-[9px] font-bold text-destructive-foreground">
              {unread.data!.count > 99 ? "99+" : unread.data!.count}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
};
