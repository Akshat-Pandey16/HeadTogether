import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api";
import type { Message, MessageCreatePayload, Page } from "@/types";

export const chatKeys = {
  messages: (roomId: string) => ["messages", roomId] as const,
  unread: (roomId: string) => ["messages", roomId, "unread"] as const,
  pinned: (roomId: string) => ["messages", roomId, "pinned"] as const,
};

export const useMessages = (roomId: string) =>
  useQuery({
    queryKey: chatKeys.messages(roomId),
    queryFn: async () => {
      const page = await messagesApi.list(roomId, { limit: 50 });
      return { ...page, items: [...page.items].reverse() };
    },
    refetchOnMount: "always",
  });

export const usePinnedMessages = (roomId: string) =>
  useQuery({ queryKey: chatKeys.pinned(roomId), queryFn: () => messagesApi.pinned(roomId) });

export const useUnread = (roomId: string) =>
  useQuery({ queryKey: chatKeys.unread(roomId), queryFn: () => messagesApi.unread(roomId) });

const upsertMessage = (
  qc: ReturnType<typeof useQueryClient>,
  roomId: string,
  message: Message,
) => {
  qc.setQueryData<Page<Message>>(chatKeys.messages(roomId), (prev) => {
    if (!prev) return { items: [message], total: 1, limit: 50, offset: 0 };
    const idx = prev.items.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      const items = [...prev.items];
      items[idx] = message;
      return { ...prev, items };
    }
    return { ...prev, items: [...prev.items, message], total: prev.total + 1 };
  });
};

const removeMessage = (
  qc: ReturnType<typeof useQueryClient>,
  roomId: string,
  messageId: string,
) => {
  qc.setQueryData<Page<Message>>(chatKeys.messages(roomId), (prev) => {
    if (!prev) return prev;
    return { ...prev, items: prev.items.filter((m) => m.id !== messageId) };
  });
};

export const useSendMessage = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MessageCreatePayload) => messagesApi.send(roomId, payload),
    onSuccess: (message) => upsertMessage(qc, roomId, message),
  });
};

export const useEditMessage = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      messagesApi.edit(roomId, id, body),
    onSuccess: (message) => upsertMessage(qc, roomId, message),
  });
};

export const useDeleteMessage = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messagesApi.remove(roomId, id),
    onSuccess: (_, id) => removeMessage(qc, roomId, id),
  });
};

export const useAddReaction = (roomId: string) => {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.addReaction(roomId, messageId, emoji),
  });
};

export const useRemoveReaction = (roomId: string) => {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.removeReaction(roomId, messageId, emoji),
  });
};

export const usePinMessage = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messagesApi.pin(roomId, id),
    onSuccess: (message) => {
      upsertMessage(qc, roomId, message);
      qc.invalidateQueries({ queryKey: chatKeys.pinned(roomId) });
    },
  });
};

export const useUnpinMessage = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messagesApi.unpin(roomId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.pinned(roomId) }),
  });
};

export const useMarkRead = (roomId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (up_to_message_id: string) => messagesApi.markRead(roomId, up_to_message_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.unread(roomId) }),
  });
};
