import { apiClient } from "../api-client";
import type {
  GenericMessage,
  MembershipState,
  NearbyRoom,
  NearbySort,
  Page,
  Room,
  RoomCreatePayload,
  RoomDetailed,
  RoomDetailItem,
  RoomEvent,
  RoomMember,
  RoomPurpose,
  RoomSummary,
  RoomUpdatePayload,
  TextSort,
} from "@/types";

type PageQuery = { limit?: number; offset?: number };

export const roomsApi = {
  create(payload: RoomCreatePayload) {
    return apiClient.request<Room>("/rooms", { method: "POST", body: payload });
  },
  listJoined(query: PageQuery & { include_archived?: boolean } = {}) {
    return apiClient.request<Page<RoomSummary>>("/rooms", { query });
  },
  listOwned(query: PageQuery = {}) {
    return apiClient.request<Page<RoomSummary>>("/rooms/owned", { query });
  },
  listPast(query: PageQuery = {}) {
    return apiClient.request<Page<RoomSummary>>("/rooms/past", { query });
  },
  listSaved(query: PageQuery = {}) {
    return apiClient.request<Page<RoomSummary>>("/rooms/saved", { query });
  },
  search(
    query: PageQuery & {
      q: string;
      purpose?: RoomPurpose;
      sort?: TextSort;
    },
  ) {
    return apiClient.request<Page<RoomSummary>>("/rooms/search", { query });
  },
  nearby(
    query: PageQuery & {
      latitude: number;
      longitude: number;
      purpose?: RoomPurpose;
      sort?: NearbySort;
      max_distance_km?: number;
    },
  ) {
    return apiClient.request<Page<NearbyRoom>>("/rooms/nearby", { query });
  },
  joinByCode(invite_code: string) {
    return apiClient.request<Room>("/rooms/join-by-code", {
      method: "POST",
      body: { invite_code },
    });
  },
  get(roomId: string) {
    return apiClient.request<RoomDetailed>(`/rooms/${roomId}`);
  },
  update(roomId: string, payload: RoomUpdatePayload) {
    return apiClient.request<Room>(`/rooms/${roomId}`, { method: "PATCH", body: payload });
  },
  remove(roomId: string) {
    return apiClient.request<void>(`/rooms/${roomId}`, { method: "DELETE" });
  },
  restore(roomId: string) {
    return apiClient.request<Room>(`/rooms/${roomId}/restore`, { method: "POST" });
  },
  archive(roomId: string) {
    return apiClient.request<Room>(`/rooms/${roomId}/archive`, { method: "POST" });
  },
  reactivate(roomId: string) {
    return apiClient.request<Room>(`/rooms/${roomId}/reactivate`, { method: "POST" });
  },
  transfer(roomId: string, new_owner_id: string) {
    return apiClient.request<Room>(`/rooms/${roomId}/transfer`, {
      method: "POST",
      body: { new_owner_id },
    });
  },
  promote(roomId: string, user_id: string) {
    return apiClient.request<GenericMessage>(`/rooms/${roomId}/promote`, {
      method: "POST",
      body: { user_id },
    });
  },
  demote(roomId: string, user_id: string) {
    return apiClient.request<GenericMessage>(`/rooms/${roomId}/demote`, {
      method: "POST",
      body: { user_id },
    });
  },
  rotateInvite(roomId: string) {
    return apiClient.request<{ invite_code: string }>(`/rooms/${roomId}/rotate-invite`, {
      method: "POST",
    });
  },
  addDetail(roomId: string, payload: { heading: string; body: string }) {
    return apiClient.request<RoomDetailItem>(`/rooms/${roomId}/details`, {
      method: "POST",
      body: payload,
    });
  },
  updateDetail(
    roomId: string,
    detailId: string,
    payload: Partial<{ heading: string; body: string }>,
  ) {
    return apiClient.request<RoomDetailItem>(`/rooms/${roomId}/details/${detailId}`, {
      method: "PATCH",
      body: payload,
    });
  },
  deleteDetail(roomId: string, detailId: string) {
    return apiClient.request<void>(`/rooms/${roomId}/details/${detailId}`, { method: "DELETE" });
  },
  join(roomId: string, body: { latitude: number; longitude: number }) {
    return apiClient.request<GenericMessage>(`/rooms/${roomId}/members`, {
      method: "POST",
      body,
    });
  },
  listMembers(
    roomId: string,
    query: PageQuery & { state?: MembershipState } = {},
  ) {
    return apiClient.request<Page<RoomMember>>(`/rooms/${roomId}/members`, { query });
  },
  leave(roomId: string) {
    return apiClient.request<void>(`/rooms/${roomId}/members/me`, { method: "DELETE" });
  },
  kick(roomId: string, userId: string) {
    return apiClient.request<void>(`/rooms/${roomId}/members/${userId}`, { method: "DELETE" });
  },
  save(roomId: string) {
    return apiClient.request<GenericMessage>(`/rooms/${roomId}/save`, { method: "POST" });
  },
  unsave(roomId: string) {
    return apiClient.request<void>(`/rooms/${roomId}/save`, { method: "DELETE" });
  },
  events(roomId: string, query: PageQuery = {}) {
    return apiClient.request<Page<RoomEvent>>(`/rooms/${roomId}/events`, { query });
  },
};
