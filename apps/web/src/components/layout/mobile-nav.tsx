import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { Bell, Compass, MessageSquare, UserRound } from "lucide-react";
import { useUnreadCount } from "@/features/notifications/notifications-queries";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/dms", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/settings", label: "You", icon: UserRound },
];

export const MobileBottomNav = () => {
  const unread = useUnreadCount();
  return (
    <nav className="grid shrink-0 grid-cols-4 border-t-2 border-ink bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className="relative flex flex-col items-center justify-center gap-1 py-2.5"
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute inset-x-3 top-0 h-0.5 bg-acid"
                  transition={{ type: "spring", stiffness: 520, damping: 36 }}
                />
              )}
              <span className="relative">
                <l.icon
                  className={cn("h-5 w-5", isActive ? "text-foreground" : "text-muted-foreground")}
                  strokeWidth={2.25}
                />
                {l.to === "/notifications" && (unread.data?.count ?? 0) > 0 && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full border border-ink bg-destructive" />
                )}
              </span>
              <span
                className={cn(
                  "font-mono text-[9px] font-bold uppercase tracking-wide",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {l.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
