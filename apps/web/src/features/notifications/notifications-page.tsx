import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "./notifications-queries";
import { NotificationType, type Notification } from "@/types";

const summarize = (n: Notification): string => {
  switch (n.type) {
    case NotificationType.MENTION:
      return "You were mentioned in a message.";
    case NotificationType.REACTION:
      return "Someone reacted to your message.";
    case NotificationType.REPLY:
      return "Someone replied to your message.";
    case NotificationType.DM_MESSAGE:
      return "New direct message.";
    case NotificationType.ROOM_KICKED:
      return "You were removed from a room.";
    case NotificationType.ROOM_PROMOTED:
      return "You were promoted to moderator.";
    case NotificationType.ROOM_DEMOTED:
      return "Your moderator role was removed.";
    case NotificationType.WAITLIST_PROMOTED:
      return "You've been promoted from a room's waitlist.";
    case NotificationType.OWNERSHIP_TRANSFERRED:
      return "Room ownership transferred.";
    case NotificationType.ROOM_ARCHIVED:
      return "A room you're in was archived.";
    case NotificationType.ROOM_DELETED:
      return "A room you're in was deleted.";
    default:
      return "New notification";
  }
};

const linkFor = (n: Notification): string | null => {
  if (n.room_id && n.message_id) return `/rooms/${n.room_id}/chat`;
  if (n.room_id) return `/rooms/${n.room_id}`;
  return null;
};

export const NotificationsPage = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notifications = useNotifications(unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Mentions, replies, reactions, and room activity.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending}
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      <Tabs value={unreadOnly ? "unread" : "all"} onValueChange={(v) => setUnreadOnly(v === "unread")}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
      </Tabs>

      {notifications.isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
        </div>
      ) : !notifications.data || notifications.data.items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <div className="space-y-2">
          {notifications.data.items.map((n) => {
            const href = linkFor(n);
            const body = (
              <Card
                className={cn(
                  "transition hover:bg-accent/40",
                  !n.read_at && "border-foreground/20 bg-accent/20",
                )}
              >
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{summarize(n)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        markRead.mutate(n.id);
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
            return (
              <div key={n.id}>
                {href ? (
                  <Link to={href} onClick={() => !n.read_at && markRead.mutate(n.id)}>
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
