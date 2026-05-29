import { apiClient } from "../api-client";
import type { GenericMessage, Report, ReportCreatePayload, UserPublic } from "@/types";

export const moderationApi = {
  listBlocked() {
    return apiClient.request<UserPublic[]>("/moderation/blocks");
  },
  report(payload: ReportCreatePayload) {
    return apiClient.request<Report>("/moderation/reports", { method: "POST", body: payload });
  },
  block(target_user_id: string) {
    return apiClient.request<GenericMessage>("/moderation/blocks", {
      method: "POST",
      body: { target_user_id },
    });
  },
  unblock(target_user_id: string) {
    return apiClient.request<void>(`/moderation/blocks/${target_user_id}`, { method: "DELETE" });
  },
};
