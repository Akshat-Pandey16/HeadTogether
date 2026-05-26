import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { LoadingPage } from "@/components/shared/loading";
import { useAuth } from "@/providers/auth-provider";
import { useRoom } from "@/features/rooms/room-queries";
import { errorMessage } from "@/lib/api-error";
import { WsEvent, type Message } from "@/types";
import {
  useAddReaction,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  usePinMessage,
  usePinnedMessages,
  useRemoveReaction,
  useMessages,
  useSendMessage,
  useUnpinMessage,
} from "./chat-queries";
import { MessageComposer } from "./message-composer";
import { MessageItem } from "./message-item";
import { useRoomSocket } from "./use-room-socket";

export const ChatPage = () => {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const room = useRoom(roomId);
  const messages = useMessages(roomId);
  const pinned = usePinnedMessages(roomId);
  const sendMessage = useSendMessage(roomId);
  const editMessage = useEditMessage(roomId);
  const deleteMessage = useDeleteMessage(roomId);
  const addReaction = useAddReaction(roomId);
  const removeReaction = useRemoveReaction(roomId);
  const pinMessage = usePinMessage(roomId);
  const unpinMessage = useUnpinMessage(roomId);
  const markRead = useMarkRead(roomId);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<string | null>(null);

  const { status, typingUsers, send } = useRoomSocket(roomId);

  const messageMap = useMemo(() => {
    const map = new Map<string, Message>();
    messages.data?.items.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages.data]);

  const pinnedIds = useMemo(() => new Set(pinned.data?.map((m) => m.id) ?? []), [pinned.data]);

  const isOwner = room.data?.is_owner ?? false;
  const isModerator = isOwner || room.data?.role === "moderator";

  useEffect(() => {
    if (!messages.data?.items.length) return;
    const lastId = messages.data.items[messages.data.items.length - 1].id;
    if (lastId === lastSeenRef.current) return;
    lastSeenRef.current = lastId;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    markRead.mutate(lastId);
  }, [messages.data, markRead]);

  if (room.isLoading || messages.isLoading) return <LoadingPage label="Loading chat" />;
  if (!room.data) return <div className="p-10 text-center">Room not found.</div>;
  if (!room.data.is_member) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-sm text-muted-foreground">Join this room to read its chat.</p>
        <Button onClick={() => navigate(`/rooms/${roomId}`)}>Go to room</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/rooms/${roomId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-semibold">{room.data.name}</p>
            <p className="text-xs text-muted-foreground">
              <Users className="mr-1 inline h-3 w-3" />
              {room.data.member_count} members ·{" "}
              <span
                className={
                  status === "open"
                    ? "text-emerald-500"
                    : status === "reconnecting"
                      ? "text-amber-500"
                      : "text-muted-foreground"
                }
              >
                {status}
              </span>
            </p>
          </div>
        </div>
        {pinned.data && pinned.data.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Pin className="h-3 w-3" /> {pinned.data.length}
          </Badge>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.data?.items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet — say hi!
          </div>
        ) : (
          <div className="space-y-1">
            {messages.data?.items.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                isOwnMessage={m.sender.id === user?.id}
                isModerator={!!isModerator}
                isPinned={pinnedIds.has(m.id)}
                parent={m.parent_message_id ? messageMap.get(m.parent_message_id) : undefined}
                onReply={setReplyTo}
                onEdit={async (msg, body) => {
                  try {
                    await editMessage.mutateAsync({ id: msg.id, body });
                  } catch (e) {
                    toast({ variant: "destructive", description: errorMessage(e) });
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await deleteMessage.mutateAsync(id);
                  } catch (e) {
                    toast({ variant: "destructive", description: errorMessage(e) });
                  }
                }}
                onPin={(id) => pinMessage.mutate(id)}
                onUnpin={(id) => unpinMessage.mutate(id)}
                onAddReaction={(messageId, emoji) =>
                  addReaction.mutate({ messageId, emoji })
                }
                onRemoveReaction={(messageId, emoji) =>
                  removeReaction.mutate({ messageId, emoji })
                }
              />
            ))}
          </div>
        )}
      </div>

      {typingUsers.length > 0 && (
        <div className="px-4 pb-1 text-xs text-muted-foreground">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
          {typingUsers.length === 1
            ? `${typingUsers[0].first_name ?? "Someone"} is typing…`
            : `${typingUsers.length} people are typing…`}
        </div>
      )}

      <MessageComposer
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onSend={(payload) => sendMessage.mutateAsync(payload)}
        onTypingStart={() => send({ type: WsEvent.TYPING_START })}
        onTypingStop={() => send({ type: WsEvent.TYPING_STOP })}
      />
    </div>
  );
};
