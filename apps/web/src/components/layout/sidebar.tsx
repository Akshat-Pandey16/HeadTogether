import { Link, NavLink, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Bell, Compass, LogOut, MessageSquare, Plus, Settings, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useUnreadCount } from "@/features/notifications/notifications-queries";
import { useAuth, useAuthActions } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number };

export const Sidebar = ({ onCreateRoom }: { onCreateRoom?: () => void }) => {
  const { user } = useAuth();
  const unread = useUnreadCount();
  const items: NavItem[] = [
    { to: "/", label: "Discover", icon: Compass },
    { to: "/dms", label: "Messages", icon: MessageSquare },
    { to: "/notifications", label: "Alerts", icon: Bell, badge: unread.data?.count ?? 0 },
  ];

  return (
    <aside className="hidden h-full shrink-0 flex-col border-r-2 border-ink bg-card md:flex md:w-[68px] lg:w-64">
      <Link to="/" className="flex h-16 shrink-0 items-center border-b-2 border-ink px-3">
        <div className="flex w-full items-center gap-2.5 px-2 max-lg:justify-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-acid font-display text-sm font-extrabold text-acid-foreground">
            HT
          </span>
          <span className="hidden font-display text-sm font-extrabold uppercase leading-[0.95] tracking-tight lg:block">
            Head
            <br />
            Together
          </span>
        </div>
      </Link>

      <div className="px-3 pt-3">
        <Button variant="acid" className="w-full max-lg:px-0" onClick={onCreateRoom} title="New room">
          <Plus className="h-4 w-4" strokeWidth={3} />
          <span className="hidden lg:inline">New Room</span>
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 pt-3">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} title={item.label}>
            {({ isActive }) => (
              <div
                className={cn(
                  "relative flex items-center gap-3 rounded-sm px-2 py-2 transition-colors max-lg:justify-center",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 z-0 rounded-sm border-2 border-ink bg-primary"
                    transition={{ type: "spring", stiffness: 520, damping: 36 }}
                  />
                )}
                <item.icon className="relative z-10 h-5 w-5 shrink-0" strokeWidth={2.25} />
                <span className="relative z-10 hidden font-mono text-xs font-bold uppercase tracking-wide lg:inline">
                  {item.label}
                </span>
                {item.badge && item.badge > 0 ? (
                  <>
                    <span className="relative z-10 ml-auto hidden h-4 min-w-4 items-center justify-center rounded-sm border border-ink bg-destructive px-1 font-mono text-[9px] font-bold text-destructive-foreground lg:inline-flex">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                    <span className="absolute right-1.5 top-1.5 z-10 h-2 w-2 rounded-full border border-ink bg-destructive lg:hidden" />
                  </>
                ) : null}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t-2 border-ink px-3 py-3">
        <div className="px-2 max-lg:flex max-lg:justify-center">
          <ThemeToggle />
        </div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-secondary max-lg:justify-center">
                <UserAvatar user={user} className="h-8 w-8 shrink-0" />
                <div className="hidden min-w-0 lg:block">
                  <p className="truncate text-sm font-bold leading-tight">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <UserMenu />
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
};

const UserMenu = () => {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <DropdownMenuContent align="start" side="top" className="w-56">
      <DropdownMenuLabel>
        {user.first_name} {user.last_name}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate(`/users/${user.id}`)}>
        <UserRound className="h-4 w-4" /> My profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate("/settings")}>
        <Settings className="h-4 w-4" /> Settings
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
  );
};
