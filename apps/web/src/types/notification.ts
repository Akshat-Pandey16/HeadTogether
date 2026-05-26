import type { DevicePlatform, NotificationType } from "./enums";

export type Notification = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  room_id: string | null;
  message_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type DeviceToken = {
  id: string;
  platform: DevicePlatform;
  created_at: string;
  last_seen_at: string | null;
};
