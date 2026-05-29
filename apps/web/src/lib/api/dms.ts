import { apiClient } from "../api-client";
import type { DirectMessage, Room } from "@/types";

export const dmsApi = {
  createOrGet(recipient_user_id: string) {
    return apiClient.request<Room>("/dms", { method: "POST", body: { recipient_user_id } });
  },
  list() {
    return apiClient.request<DirectMessage[]>("/dms");
  },
};
