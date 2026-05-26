from __future__ import annotations

from enum import StrEnum


class RoomPurpose(StrEnum):
    PLAY = "play"
    MOVIE = "movie"
    TRAVEL = "travel"
    CHAT = "chat"
    LANDMARK = "landmark"
    CUSTOM = "custom"


class RoomRole(StrEnum):
    OWNER = "owner"
    MEMBER = "member"


class Gender(StrEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"
