from __future__ import annotations

from enum import StrEnum


class RoomPurpose(StrEnum):
    PLAY = "play"
    MOVIE = "movie"
    TRAVEL = "travel"
    CHAT = "chat"
    LANDMARK = "landmark"
    CUSTOM = "custom"


class RoomVisibility(StrEnum):
    PUBLIC = "public"
    PRIVATE = "private"
    DM = "dm"


class RoomStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class RoomRole(StrEnum):
    OWNER = "owner"
    MODERATOR = "moderator"
    MEMBER = "member"


class MembershipState(StrEnum):
    ACTIVE = "active"
    WAITLISTED = "waitlisted"
    BANNED = "banned"


class Gender(StrEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class MessageType(StrEnum):
    TEXT = "text"
    SYSTEM = "system"


class ReportTarget(StrEnum):
    USER = "user"
    ROOM = "room"
    MESSAGE = "message"


class ReportReason(StrEnum):
    SPAM = "spam"
    HARASSMENT = "harassment"
    INAPPROPRIATE = "inappropriate"
    FAKE_PROFILE = "fake_profile"
    OTHER = "other"


class ReportStatus(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    DISMISSED = "dismissed"
    ACTIONED = "actioned"


class DevicePlatform(StrEnum):
    IOS = "ios"
    ANDROID = "android"
    WEB = "web"


class RoomEventType(StrEnum):
    CREATED = "created"
    UPDATED = "updated"
    ARCHIVED = "archived"
    REACTIVATED = "reactivated"
    DELETED = "deleted"
    RESTORED = "restored"
    OWNERSHIP_TRANSFERRED = "ownership_transferred"
    MEMBER_JOINED = "member_joined"
    MEMBER_LEFT = "member_left"
    MEMBER_KICKED = "member_kicked"
    MEMBER_PROMOTED = "member_promoted"
    MEMBER_DEMOTED = "member_demoted"
    WAITLIST_JOINED = "waitlist_joined"
    WAITLIST_PROMOTED = "waitlist_promoted"
