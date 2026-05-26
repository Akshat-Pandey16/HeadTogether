import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WsSocket, type WsStatus } from "@/lib/ws-client";
import { useAuthStore } from "@/stores/auth-store";
import { WsEvent, type Message, type Page, type ReactionSummary } from "@/types";
import { chatKeys } from "./chat-queries";

type Typing = { user_id: string; first_name?: string };
type ReactionEvent = { message_id: string; user_id: string; emoji: string };

type Result = {
  status: WsStatus;
  typingUsers: Typing[];
  presentUsers: Set<string>;
  send: (payload: { type: string; data?: Record<string, unknown> }) => void;
};

export const useRoomSocket = (roomId: string): Result => {
  const queryClient = useQueryClient();
  const tokens = useAuthStore((s) => s.tokens);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [typingUsers, setTypingUsers] = useState<Typing[]>([]);
  const [presentUsers, setPresentUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<WsSocket | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tokens?.access_token || !roomId) return;
    const messages = queryClient.getQueryData<Page<Message>>(chatKeys.messages(roomId));
    const lastId = messages?.items[messages.items.length - 1]?.id;
    if (lastId) lastMessageIdRef.current = lastId;

    const socket = new WsSocket({
      path: `/ws/rooms/${roomId}`,
      token: tokens.access_token,
      query: lastId ? { since_message_id: lastId } : undefined,
      onStatus: setStatus,
      onMessage: (msg) => {
        switch (msg.type) {
          case WsEvent.MESSAGE_CREATED: {
            const m = msg.data as unknown as Message;
            lastMessageIdRef.current = m.id;
            queryClient.setQueryData<Page<Message>>(chatKeys.messages(roomId), (prev) => {
              if (!prev) return { items: [m], total: 1, limit: 50, offset: 0 };
              if (prev.items.some((x) => x.id === m.id)) return prev;
              return { ...prev, items: [...prev.items, m], total: prev.total + 1 };
            });
            setTypingUsers((u) => u.filter((t) => t.user_id !== m.sender.id));
            break;
          }
          case WsEvent.MESSAGE_UPDATED:
          case WsEvent.MESSAGE_PINNED: {
            const m = msg.data as unknown as Message;
            queryClient.setQueryData<Page<Message>>(chatKeys.messages(roomId), (prev) => {
              if (!prev) return prev;
              const items = prev.items.map((x) => (x.id === m.id ? m : x));
              return { ...prev, items };
            });
            queryClient.invalidateQueries({ queryKey: chatKeys.pinned(roomId) });
            break;
          }
          case WsEvent.MESSAGE_DELETED:
          case WsEvent.MESSAGE_UNPINNED: {
            const id = (msg.data?.id as string) ?? "";
            queryClient.setQueryData<Page<Message>>(chatKeys.messages(roomId), (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                items:
                  msg.type === WsEvent.MESSAGE_DELETED
                    ? prev.items.filter((x) => x.id !== id)
                    : prev.items,
              };
            });
            queryClient.invalidateQueries({ queryKey: chatKeys.pinned(roomId) });
            break;
          }
          case WsEvent.REACTION_ADDED: {
            applyReaction(queryClient, roomId, msg.data as unknown as ReactionEvent, true, currentUserId);
            break;
          }
          case WsEvent.REACTION_REMOVED: {
            applyReaction(queryClient, roomId, msg.data as unknown as ReactionEvent, false, currentUserId);
            break;
          }
          case WsEvent.TYPING_START: {
            const data = msg.data as Typing;
            if (data.user_id === currentUserId) break;
            setTypingUsers((u) => {
              const without = u.filter((t) => t.user_id !== data.user_id);
              return [...without, data];
            });
            break;
          }
          case WsEvent.TYPING_STOP: {
            const data = msg.data as Typing;
            setTypingUsers((u) => u.filter((t) => t.user_id !== data.user_id));
            break;
          }
          case WsEvent.PRESENCE_JOINED: {
            const id = msg.data?.user_id as string;
            setPresentUsers((s) => new Set(s).add(id));
            break;
          }
          case WsEvent.PRESENCE_LEFT: {
            const id = msg.data?.user_id as string;
            setPresentUsers((s) => {
              const next = new Set(s);
              next.delete(id);
              return next;
            });
            break;
          }
          case WsEvent.RECOVERY: {
            const recovered = (msg.data?.messages as Message[]) ?? [];
            if (recovered.length === 0) break;
            queryClient.setQueryData<Page<Message>>(chatKeys.messages(roomId), (prev) => {
              if (!prev) return { items: recovered, total: recovered.length, limit: 50, offset: 0 };
              const ids = new Set(prev.items.map((m) => m.id));
              const merged = [...prev.items, ...recovered.filter((m) => !ids.has(m.id))];
              return { ...prev, items: merged, total: merged.length };
            });
            const last = recovered[recovered.length - 1];
            if (last) lastMessageIdRef.current = last.id;
            break;
          }
          default:
            break;
        }
      },
    });
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.close();
      socketRef.current = null;
      setTypingUsers([]);
      setPresentUsers(new Set());
    };
  }, [roomId, tokens?.access_token, queryClient, currentUserId]);

  return {
    status,
    typingUsers,
    presentUsers,
    send: (payload) => socketRef.current?.send(payload),
  };
};

const applyReaction = (
  qc: ReturnType<typeof useQueryClient>,
  roomId: string,
  evt: ReactionEvent,
  add: boolean,
  currentUserId: string | undefined,
) => {
  qc.setQueryData<Page<Message>>(chatKeys.messages(roomId), (prev) => {
    if (!prev) return prev;
    const items = prev.items.map((m) => {
      if (m.id !== evt.message_id) return m;
      const reactions = updateReactions(m.reactions, evt.emoji, evt.user_id, add, currentUserId);
      return { ...m, reactions };
    });
    return { ...prev, items };
  });
};

const updateReactions = (
  current: ReactionSummary[],
  emoji: string,
  userId: string,
  add: boolean,
  currentUserId: string | undefined,
): ReactionSummary[] => {
  const isMe = userId === currentUserId;
  const existing = current.find((r) => r.emoji === emoji);
  if (!existing) {
    if (!add) return current;
    return [...current, { emoji, count: 1, reacted_by_me: isMe }];
  }
  const nextCount = existing.count + (add ? 1 : -1);
  if (nextCount <= 0) return current.filter((r) => r.emoji !== emoji);
  return current.map((r) =>
    r.emoji === emoji
      ? { ...r, count: nextCount, reacted_by_me: isMe ? add : r.reacted_by_me }
      : r,
  );
};
