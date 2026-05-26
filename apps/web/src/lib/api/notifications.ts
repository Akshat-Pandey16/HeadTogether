import { apiClient } from "../api-client";
import type {
  DeviceToken,
  GenericMessage,
  Notification,
  Page,
  UnreadCountResponse,
} from "@/types";

type ListQuery = { limit?: number; offset?: number; unread_only?: boolean };

export const notificationsApi = {
  list(query: ListQuery = {}) {
    return apiClient.request<Page<Notification>>("/notifications", { query });
  },
  unreadCount() {
    return apiClient.request<UnreadCountResponse>("/notifications/unread-count");
  },
  markRead(id: string) {
    return apiClient.request<Notification>(`/notifications/${id}/read`, { method: "POST" });
  },
  markAllRead() {
    return apiClient.request<GenericMessage>("/notifications/read-all", { method: "POST" });
  },
  registerToken(token: string, platform: "web" | "ios" | "android") {
    return apiClient.request<DeviceToken>("/notifications/device-tokens", {
      method: "POST",
      body: { token, platform },
    });
  },
  revokeToken(token: string) {
    return apiClient.request<void>(`/notifications/device-tokens/${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
  },
  listTokens() {
    return apiClient.request<DeviceToken[]>("/notifications/device-tokens");
  },
};
