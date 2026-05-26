import type { MessageType } from "./enums";
import type { UserPublic } from "./user";

export type ReactionSummary = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export type Message = {
  id: string;
  room_id: string;
  sender: UserPublic;
  body: string;
  message_type: MessageType;
  parent_message_id: string | null;
  client_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  pinned_at: string | null;
  reactions: ReactionSummary[];
  created_at: string;
  mentions?: string[];
};

export type MessageCreatePayload = {
  body: string;
  parent_message_id?: string | null;
  client_message_id?: string;
};

export type UnreadResponse = {
  count: number;
  last_read_message_id: string | null;
  last_read_at: string | null;
};
