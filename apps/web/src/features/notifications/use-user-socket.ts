import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WsSocket } from "@/lib/ws-client";
import { useAuthStore } from "@/stores/auth-store";
import { WsEvent, type Notification } from "@/types";
import { toast } from "@/components/ui/toaster";
import { notificationKeys } from "./notifications-queries";

const titleFor = (type: string): string => {
  switch (type) {
    case "mention":
      return "You were mentioned";
    case "reaction":
      return "New reaction";
    case "reply":
      return "New reply";
    case "dm_message":
      return "New message";
    case "room_kicked":
      return "Removed from room";
    case "room_promoted":
      return "Promoted to moderator";
    case "room_demoted":
      return "Moderator role removed";
    case "waitlist_promoted":
      return "You're in!";
    case "ownership_transferred":
      return "Room transferred";
    case "room_archived":
      return "Room archived";
    case "room_deleted":
      return "Room deleted";
    default:
      return "Notification";
  }
};

export const useUserSocket = () => {
  const tokens = useAuthStore((s) => s.tokens);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tokens?.access_token) return;
    const socket = new WsSocket({
      path: "/ws/me",
      token: tokens.access_token,
      onMessage: (msg) => {
        if (msg.type !== WsEvent.NOTIFICATION_CREATED) return;
        const notification = msg.data as unknown as Notification;
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unread });
        toast({ title: titleFor(notification.type) });
      },
    });
    socket.connect();
    return () => socket.close();
  }, [tokens?.access_token, queryClient]);
};
