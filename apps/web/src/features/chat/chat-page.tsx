import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pin, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { LoadingPage } from "@/components/shared/loading";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/providers/auth-provider";
import { useRoom, useRoomMembers } from "@/features/rooms/room-queries";
import { errorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { WsEvent, type Message } from "@/types";
import {
  useAddReaction,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  useMessages,
  usePinMessage,
  usePinnedMessages,
  useRemoveReaction,
  useSendMessage,
  useUnpinMessage,
} from "./chat-queries";
import { MessageComposer } from "./message-composer";
import { MessageItem } from "./message-item";
import { MessageSearch } from "./message-search";
import { useRoomSocket } from "./use-room-socket";

const STATUS_META: Record<string, { color: string; label: string }> = {
  open: { color: "bg-acid", label: "live" },
  connecting: { color: "bg-custom", label: "connecting" },
  reconnecting: { color: "bg-custom", label: "reconnecting" },
  closed: { color: "bg-destructive", label: "offline" },
};

export const ChatPage = () => {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const room = useRoom(roomId);
  const members = useRoomMembers(roomId);
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

  const { status, typingUsers, presentUsers, send } = useRoomSocket(roomId);

  const messageMap = useMemo(() => {
    const map = new Map<string, Message>();
    messages.data?.items.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages.data]);

  const pinnedIds = useMemo(() => new Set(pinned.data?.map((m) => m.id) ?? []), [pinned.data]);
  const presentMembers = useMemo(
    () => (members.data?.items ?? []).filter((m) => presentUsers.has(m.user.id)),
    [members.data, presentUsers],
  );

  const isOwner = room.data?.is_owner ?? false;
  const isModerator = isOwner || room.data?.role === "moderator";

  useEffect(() => {
    if (!messages.data?.items.length) return;
    const last = messages.data.items[messages.data.items.length - 1];
    if (last.id === lastSeenRef.current) return;
    lastSeenRef.current = last.id;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (last.sender.id === user?.id) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    markRead.mutate(last.id);
  }, [messages.data, markRead, user?.id]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      const items = messages.data?.items;
      if (!items?.length) return;
      const last = items[items.length - 1];
      if (last.sender.id === user?.id) return;
      lastSeenRef.current = last.id;
      markRead.mutate(last.id);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [messages.data, markRead, user?.id]);

  if (room.isLoading || messages.isLoading) return <LoadingPage label="Loading chat" />;
  if (!room.data)
    return <div className="grid h-full place-items-center text-muted-foreground">Room not found.</div>;
  if (!room.data.is_member) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="font-mono text-sm text-muted-foreground">Join this room to read its chat.</p>
        <Button variant="acid" onClick={() => navigate(`/rooms/${roomId}`)}>
          Go to room
        </Button>
      </div>
    );
  }

  const statusMeta = STATUS_META[status] ?? STATUS_META.closed;

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-ink bg-card px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/rooms/${roomId}`)}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold leading-tight">
              {room.data.name}
            </p>
            <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full border border-ink", statusMeta.color)} />
              {statusMeta.label}
              <span className="opacity-40">·</span>
              <Users className="h-3 w-3" strokeWidth={2.5} />
              {room.data.member_count}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {pinned.data && pinned.data.length > 0 && (
            <span className="hidden items-center gap-1 rounded-sm border-2 border-ink bg-acid px-1.5 py-0.5 font-mono text-[10px] font-bold text-acid-foreground sm:inline-flex">
              <Pin className="h-3 w-3" strokeWidth={2.5} /> {pinned.data.length}
            </span>
          )}
          <MessageSearch roomId={roomId} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3">
            {messages.data?.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Radio className="h-8 w-8" strokeWidth={1.5} />
                <p className="font-mono text-sm">No signal yet — say hi.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
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
                    onAddReaction={(messageId, emoji) => addReaction.mutate({ messageId, emoji })}
                    onRemoveReaction={(messageId, emoji) =>
                      removeReaction.mutate({ messageId, emoji })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-5 px-4">
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {typingUsers.length === 1
                  ? `${typingUsers[0].first_name ?? "Someone"} is typing…`
                  : `${typingUsers.length} people typing…`}
              </div>
            )}
          </div>

          <MessageComposer
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            onSend={(payload) => sendMessage.mutateAsync(payload)}
            onTypingStart={() => send({ type: WsEvent.TYPING_START })}
            onTypingStop={() => send({ type: WsEvent.TYPING_STOP })}
          />
        </section>

        <aside className="hidden w-72 shrink-0 flex-col border-l-2 border-ink bg-card xl:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {pinned.data && pinned.data.length > 0 && (
              <div className="border-b-2 border-ink p-3">
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <Pin className="h-3.5 w-3.5" strokeWidth={2.5} /> Pinned
                </p>
                <div className="space-y-2">
                  {pinned.data.map((m) => (
                    <div key={m.id} className="rounded-sm border-2 border-ink bg-secondary p-2">
                      <p className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        {m.sender.first_name}
                      </p>
                      <p className="line-clamp-3 text-xs">{m.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <span className="h-2 w-2 rounded-full border border-ink bg-acid" /> Here now ·{" "}
                {presentMembers.length}
              </p>
              <div className="space-y-1.5">
                {presentMembers.length === 0 ? (
                  <p className="font-mono text-[11px] text-muted-foreground">No one else right now.</p>
                ) : (
                  presentMembers.map((m) => (
                    <Link
                      key={m.user.id}
                      to={`/users/${m.user.id}`}
                      className="flex items-center gap-2 rounded-sm border-2 border-transparent p-1 transition hover:border-ink hover:bg-secondary"
                    >
                      <div className="relative">
                        <UserAvatar user={m.user} className="h-7 w-7" />
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-acid" />
                      </div>
                      <span className="truncate text-xs font-bold">
                        {m.user.first_name} {m.user.last_name}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
