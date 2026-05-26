export const Gender = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  PREFER_NOT_TO_SAY: "prefer_not_to_say",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const RoomPurpose = {
  PLAY: "play",
  MOVIE: "movie",
  TRAVEL: "travel",
  CHAT: "chat",
  LANDMARK: "landmark",
  CUSTOM: "custom",
} as const;
export type RoomPurpose = (typeof RoomPurpose)[keyof typeof RoomPurpose];

export const RoomVisibility = {
  PUBLIC: "public",
  PRIVATE: "private",
  DM: "dm",
} as const;
export type RoomVisibility = (typeof RoomVisibility)[keyof typeof RoomVisibility];

export const RoomStatus = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  DELETED: "deleted",
} as const;
export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

export const RoomRole = {
  OWNER: "owner",
  MODERATOR: "moderator",
  MEMBER: "member",
} as const;
export type RoomRole = (typeof RoomRole)[keyof typeof RoomRole];

export const MembershipState = {
  ACTIVE: "active",
  WAITLISTED: "waitlisted",
  BANNED: "banned",
} as const;
export type MembershipState = (typeof MembershipState)[keyof typeof MembershipState];

export const MessageType = {
  TEXT: "text",
  SYSTEM: "system",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const ReportTarget = {
  USER: "user",
  ROOM: "room",
  MESSAGE: "message",
} as const;
export type ReportTarget = (typeof ReportTarget)[keyof typeof ReportTarget];

export const ReportReason = {
  SPAM: "spam",
  HARASSMENT: "harassment",
  INAPPROPRIATE: "inappropriate",
  FAKE_PROFILE: "fake_profile",
  OTHER: "other",
} as const;
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const ReportStatus = {
  PENDING: "pending",
  REVIEWED: "reviewed",
  DISMISSED: "dismissed",
  ACTIONED: "actioned",
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const DevicePlatform = {
  IOS: "ios",
  ANDROID: "android",
  WEB: "web",
} as const;
export type DevicePlatform = (typeof DevicePlatform)[keyof typeof DevicePlatform];

export const NotificationType = {
  MENTION: "mention",
  REACTION: "reaction",
  REPLY: "reply",
  DM_MESSAGE: "dm_message",
  ROOM_KICKED: "room_kicked",
  ROOM_PROMOTED: "room_promoted",
  ROOM_DEMOTED: "room_demoted",
  WAITLIST_PROMOTED: "waitlist_promoted",
  OWNERSHIP_TRANSFERRED: "ownership_transferred",
  ROOM_ARCHIVED: "room_archived",
  ROOM_DELETED: "room_deleted",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const RoomEventType = {
  CREATED: "created",
  UPDATED: "updated",
  ARCHIVED: "archived",
  REACTIVATED: "reactivated",
  DELETED: "deleted",
  RESTORED: "restored",
  OWNERSHIP_TRANSFERRED: "ownership_transferred",
  MEMBER_JOINED: "member_joined",
  MEMBER_LEFT: "member_left",
  MEMBER_KICKED: "member_kicked",
  MEMBER_PROMOTED: "member_promoted",
  MEMBER_DEMOTED: "member_demoted",
  WAITLIST_JOINED: "waitlist_joined",
  WAITLIST_PROMOTED: "waitlist_promoted",
} as const;
export type RoomEventType = (typeof RoomEventType)[keyof typeof RoomEventType];

export const WsEvent = {
  MESSAGE_CREATED: "message.created",
  MESSAGE_UPDATED: "message.updated",
  MESSAGE_DELETED: "message.deleted",
  REACTION_ADDED: "reaction.added",
  REACTION_REMOVED: "reaction.removed",
  MESSAGE_PINNED: "message.pinned",
  MESSAGE_UNPINNED: "message.unpinned",
  READ_UPDATED: "read.updated",
  TYPING_START: "typing.start",
  TYPING_STOP: "typing.stop",
  PRESENCE_JOINED: "presence.joined",
  PRESENCE_LEFT: "presence.left",
  MEMBER_JOINED: "member.joined",
  MEMBER_LEFT: "member.left",
  MEMBER_KICKED: "member.kicked",
  ROOM_UPDATED: "room.updated",
  ROOM_ARCHIVED: "room.archived",
  ROOM_DELETED: "room.deleted",
  NOTIFICATION_CREATED: "notification.created",
  RECOVERY: "recovery",
  PING: "ping",
  PONG: "pong",
  ERROR: "error",
} as const;
export type WsEvent = (typeof WsEvent)[keyof typeof WsEvent];
