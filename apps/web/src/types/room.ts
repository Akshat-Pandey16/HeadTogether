import type {
  MembershipState,
  RoomEventType,
  RoomPurpose,
  RoomRole,
  RoomStatus,
  RoomVisibility,
} from "./enums";
import type { Tag } from "./tag";
import type { UserPublic } from "./user";

export type Room = {
  id: string;
  owner_id: string;
  name: string;
  purpose: RoomPurpose;
  custom_purpose: string | null;
  latitude: number;
  longitude: number;
  radius_km: number;
  visibility: RoomVisibility;
  status: RoomStatus;
  max_members: number;
  expires_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cover_photo_url: string | null;
  description: string | null;
  created_at: string;
};

export type RoomSummary = Room & {
  owner: UserPublic;
  member_count: number;
  is_member: boolean;
  is_owner: boolean;
  is_saved: boolean;
  role: RoomRole | null;
  state: MembershipState | null;
  tags: Tag[];
};

export type RoomDetailItem = {
  id: string;
  heading: string;
  body: string;
  created_at: string;
};

export type RoomDetailed = RoomSummary & {
  details: RoomDetailItem[];
  invite_code: string | null;
  waitlist_count: number;
};

export type NearbyRoom = RoomSummary & { distance_km: number };

export type RoomMember = {
  user: UserPublic;
  role: RoomRole;
  state: MembershipState;
};

export type DirectMessage = {
  id: string;
  created_at: string;
  participants: UserPublic[];
};

export type RoomEvent = {
  id: string;
  event_type: RoomEventType;
  actor_id: string | null;
  target_user_id: string | null;
  payload: string | null;
  created_at: string;
};

export type RoomCreatePayload = {
  name: string;
  purpose: RoomPurpose;
  latitude: number;
  longitude: number;
  radius_km: number;
  custom_purpose?: string | null;
  max_members?: number;
  visibility?: RoomVisibility;
  expires_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  cover_photo_url?: string | null;
  description?: string | null;
  tags?: string[];
};

export type RoomUpdatePayload = Partial<{
  name: string;
  radius_km: number;
  visibility: RoomVisibility;
  max_members: number;
  expires_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cover_photo_url: string | null;
  description: string | null;
}>;

export type NearbySort = "distance" | "newest" | "members" | "starts_at";
export type TextSort = "newest" | "starts_at";
