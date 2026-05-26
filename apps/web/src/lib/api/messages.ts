import { apiClient } from "../api-client";
import type {
  GenericMessage,
  Message,
  MessageCreatePayload,
  Page,
  UnreadResponse,
} from "@/types";

type ListQuery = { limit?: number; before_id?: string; after_id?: string };

export const messagesApi = {
  list(roomId: string, query: ListQuery = {}) {
    return apiClient.request<Page<Message>>(`/rooms/${roomId}/messages`, { query });
  },
  send(roomId: string, payload: MessageCreatePayload) {
    return apiClient.request<Message>(`/rooms/${roomId}/messages`, {
      method: "POST",
      body: payload,
    });
  },
  edit(roomId: string, messageId: string, body: string) {
    return apiClient.request<Message>(`/rooms/${roomId}/messages/${messageId}`, {
      method: "PATCH",
      body: { body },
    });
  },
  remove(roomId: string, messageId: string) {
    return apiClient.request<void>(`/rooms/${roomId}/messages/${messageId}`, { method: "DELETE" });
  },
  addReaction(roomId: string, messageId: string, emoji: string) {
    return apiClient.request<GenericMessage>(`/rooms/${roomId}/messages/${messageId}/reactions`, {
      method: "POST",
      body: { emoji },
    });
  },
  removeReaction(roomId: string, messageId: string, emoji: string) {
    return apiClient.request<void>(
      `/rooms/${roomId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      { method: "DELETE" },
    );
  },
  pin(roomId: string, messageId: string) {
    return apiClient.request<Message>(`/rooms/${roomId}/messages/${messageId}/pin`, {
      method: "POST",
    });
  },
  unpin(roomId: string, messageId: string) {
    return apiClient.request<void>(`/rooms/${roomId}/messages/${messageId}/pin`, {
      method: "DELETE",
    });
  },
  pinned(roomId: string) {
    return apiClient.request<Message[]>(`/rooms/${roomId}/messages/pinned`);
  },
  search(roomId: string, q: string, limit = 50) {
    return apiClient.request<Message[]>(`/rooms/${roomId}/messages/search`, {
      query: { q, limit },
    });
  },
  markRead(roomId: string, up_to_message_id: string) {
    return apiClient.request<GenericMessage>(`/rooms/${roomId}/read`, {
      method: "POST",
      body: { up_to_message_id },
    });
  },
  unread(roomId: string) {
    return apiClient.request<UnreadResponse>(`/rooms/${roomId}/unread`);
  },
};
