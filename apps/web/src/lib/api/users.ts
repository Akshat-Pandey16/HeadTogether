import { apiClient } from "../api-client";
import type { Tag, User, UserProfile, UserUpdate } from "@/types";

export const usersApi = {
  me() {
    return apiClient.request<User>("/users/me");
  },
  updateMe(payload: UserUpdate) {
    return apiClient.request<User>("/users/me", { method: "PATCH", body: payload });
  },
  deleteMe() {
    return apiClient.request<void>("/users/me", { method: "DELETE" });
  },
  myTags() {
    return apiClient.request<Tag[]>("/users/me/tags");
  },
  setMyTags(slugs: string[]) {
    return apiClient.request<Tag[]>("/users/me/tags", { method: "PUT", body: { slugs } });
  },
  profile(userId: string) {
    return apiClient.request<UserProfile>(`/users/${userId}`);
  },
};
