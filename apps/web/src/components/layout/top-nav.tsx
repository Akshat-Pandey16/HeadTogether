import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, Compass, LogOut, MessageSquare, Settings, UserRound } from "lucide-react";
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
import { useUnreadCount } from "@/features/notifications/notifications-queries";
import { useAuth, useAuthActions } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Rooms", icon: Compass },
  { to: "/dms", label: "DMs", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export const TopNav = () => {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const unread = useUnreadCount();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-semibold tracking-tight">
            HeadTogether
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                    isActive && "bg-accent text-foreground",
                  )
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
                {l.to === "/notifications" && unread.data && unread.data.count > 0 ? (
                  <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unread.data.count > 99 ? "99+" : unread.data.count}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <UserAvatar user={user} className="h-9 w-9" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user.first_name} {user.last_name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`/users/${user.id}`)}>
                <UserRound className="mr-2 h-4 w-4" /> My profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <MobileTabs />
    </header>
  );
};

const MobileTabs = () => {
  const unread = useUnreadCount();
  return (
    <nav className="grid grid-cols-3 border-t border-border md:hidden">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground transition",
              isActive && "text-foreground",
            )
          }
        >
          <l.icon className="h-4 w-4" />
          {l.label}
          {l.to === "/notifications" && unread.data && unread.data.count > 0 ? (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread.data.count > 99 ? "99+" : unread.data.count}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
};
