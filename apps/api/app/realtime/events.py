from __future__ import annotations

from enum import StrEnum


class WsEvent(StrEnum):
    MESSAGE_CREATED = "message.created"
    MESSAGE_UPDATED = "message.updated"
    MESSAGE_DELETED = "message.deleted"
    REACTION_ADDED = "reaction.added"
    REACTION_REMOVED = "reaction.removed"
    MESSAGE_PINNED = "message.pinned"
    MESSAGE_UNPINNED = "message.unpinned"
    READ_UPDATED = "read.updated"
    TYPING_START = "typing.start"
    TYPING_STOP = "typing.stop"
    PRESENCE_JOINED = "presence.joined"
    PRESENCE_LEFT = "presence.left"
    MEMBER_JOINED = "member.joined"
    MEMBER_LEFT = "member.left"
    MEMBER_KICKED = "member.kicked"
    ROOM_UPDATED = "room.updated"
    ROOM_ARCHIVED = "room.archived"
    ROOM_DELETED = "room.deleted"
    NOTIFICATION_CREATED = "notification.created"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"
