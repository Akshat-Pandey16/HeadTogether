import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  AtSign,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Crown,
  Loader2,
  MessageCircle,
  Reply,
  Smile,
  Trash2,
  UserMinus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NotificationType, type Notification } from "@/types";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "./notifications-queries";

const META: Record<NotificationType, { icon: LucideIcon; text: string; color: string }> = {
  [NotificationType.MENTION]: { icon: AtSign, text: "mentioned you", color: "var(--color-chat)" },
  [NotificationType.REACTION]: { icon: Smile, text: "reacted to your message", color: "var(--color-custom)" },
  [NotificationType.REPLY]: { icon: Reply, text: "replied to you", color: "var(--color-play)" },
  [NotificationType.DM_MESSAGE]: { icon: MessageCircle, text: "sent you a message", color: "var(--color-chat)" },
  [NotificationType.ROOM_KICKED]: { icon: UserMinus, text: "removed you from a room", color: "var(--color-landmark)" },
  [NotificationType.ROOM_PROMOTED]: { icon: ChevronUp, text: "promoted you to moderator", color: "var(--color-play)" },
  [NotificationType.ROOM_DEMOTED]: { icon: ChevronDown, text: "removed your moderator role", color: "var(--color-travel)" },
  [NotificationType.WAITLIST_PROMOTED]: { icon: ChevronUp, text: "promoted you off the waitlist", color: "var(--color-play)" },
  [NotificationType.OWNERSHIP_TRANSFERRED]: { icon: Crown, text: "made you a room owner", color: "var(--color-custom)" },
  [NotificationType.ROOM_ARCHIVED]: { icon: Archive, text: "archived a room you're in", color: "var(--color-travel)" },
  [NotificationType.ROOM_DELETED]: { icon: Trash2, text: "deleted a room you're in", color: "var(--color-landmark)" },
};

const linkFor = (n: Notification): string | null => {
  if (n.room_id) return n.message_id ? `/rooms/${n.room_id}/chat` : `/rooms/${n.room_id}`;
  return null;
};

const preview = (n: Notification): string | null => {
  const body = n.payload?.body;
  if (typeof body === "string") return body;
  const emoji = n.payload?.emoji;
  if (typeof emoji === "string") return emoji;
  const roomName = n.payload?.room_name;
  if (typeof roomName === "string") return roomName;
  return null;
};

export const NotificationsPage = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifications = useNotifications(unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b-2 border-ink bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-ink bg-acid text-acid-foreground">
            <Bell className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Alerts</h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              mentions · replies · reactions · room activity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-sm border-2 border-ink">
            {(["all", "unread"] as const).map((v, i) => (
              <button
                key={v}
                onClick={() => setUnreadOnly(v === "unread")}
                className={cn(
                  "px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide transition",
                  i > 0 && "border-l-2 border-ink",
                  (v === "unread") === unreadOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Mark all</span>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {notifications.isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
          </div>
        ) : !notifications.data || notifications.data.items.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="All caught up"
            description={unreadOnly ? "No unread alerts." : "Nothing here yet."}
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
            {notifications.data.items.map((n) => {
              const meta = META[n.type] ?? { icon: Bell, text: "new alert", color: "var(--color-chat)" };
              const Icon = meta.icon;
              const href = linkFor(n);
              const text = preview(n);
              const row = (
                <div
                  className={cn(
                    "flex h-full items-start gap-3 rounded-sm border-2 border-ink bg-card p-3 transition hover:bg-secondary",
                    !n.read_at && "shadow-brutal-sm",
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2 border-ink text-black"
                    style={{ backgroundColor: meta.color }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug">Someone {meta.text}</p>
                    {text && <p className="line-clamp-1 text-xs text-muted-foreground">{text}</p>}
                    <p className="mt-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read_at && (
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink bg-acid" />
                  )}
                </div>
              );
              return href ? (
                <Link key={n.id} to={href} onClick={() => !n.read_at && markRead.mutate(n.id)}>
                  {row}
                </Link>
              ) : (
                <button
                  key={n.id}
                  className="text-left"
                  onClick={() => !n.read_at && markRead.mutate(n.id)}
                >
                  {row}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
