import { Link, NavLink, useNavigate } from "react-router-dom";
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

const useNavItems = (): NavItem[] => {
  const unread = useUnreadCount();
  return [
    { to: "/", label: "Discover", icon: Compass },
    { to: "/dms", label: "Messages", icon: MessageSquare },
    { to: "/notifications", label: "Alerts", icon: Bell, badge: unread.data?.count ?? 0 },
  ];
};

export const Sidebar = ({ onCreateRoom }: { onCreateRoom?: () => void }) => {
  const { user } = useAuth();
  const items = useNavItems();

  return (
    <aside className="hidden h-full shrink-0 flex-col border-r-2 border-ink bg-card md:flex md:w-[68px] lg:w-60">
      <Link
        to="/"
        className="flex h-16 items-center gap-2 border-b-2 border-ink px-4 lg:px-5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-acid font-display text-sm font-extrabold text-acid-foreground">
          HT
        </span>
        <span className="hidden font-display text-lg font-extrabold tracking-tight lg:block">
          HeadTogether
        </span>
      </Link>

      <div className="px-3 pt-4 lg:px-4">
        <Button
          variant="acid"
          className="w-full justify-center lg:justify-start"
          onClick={onCreateRoom}
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          <span className="hidden lg:inline">New Room</span>
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 p-3 lg:p-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={item.label}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-sm border-2 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide transition",
                "justify-center lg:justify-start",
                isActive
                  ? "border-ink bg-primary text-primary-foreground"
                  : "border-transparent text-muted-foreground hover:border-ink hover:bg-secondary hover:text-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" strokeWidth={2.25} />
            <span className="hidden lg:inline">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-ink bg-destructive px-1 font-mono text-[9px] font-bold text-destructive-foreground lg:static lg:ml-auto">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t-2 border-ink p-3 lg:p-4">
        <ThemeToggle className="self-center lg:self-start" />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-sm border-2 border-transparent p-1 text-left transition hover:border-ink hover:bg-secondary">
                <UserAvatar user={user} className="h-9 w-9" />
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
    <DropdownMenuContent align="end" side="top" className="w-56">
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
