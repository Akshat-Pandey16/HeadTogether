from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import RoomTag, Tag, UserTag
from app.repositories.tag import RoomTagRepository, TagRepository, UserTagRepository

_SLUG_PATTERN = re.compile(r"[^a-z0-9-]+")


def _slugify(label: str) -> str:
    slug = _SLUG_PATTERN.sub("-", label.strip().lower()).strip("-")
    return slug[:40]


class TagService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tags = TagRepository(session)
        self.user_tags = UserTagRepository(session)
        self.room_tags = RoomTagRepository(session)

    async def list_user_tags(self, user_id: UUID) -> list[Tag]:
        return await self.user_tags.list_tags_for_user(user_id)

    async def list_room_tags(self, room_id: UUID) -> list[Tag]:
        return await self.room_tags.list_tags_for_room(room_id)

    async def set_user_tags(self, user_id: UUID, labels: list[str]) -> list[Tag]:
        tags = await self._ensure_tags(labels)
        await self.user_tags.delete_by(user_id=user_id)
        for tag in tags:
            await self.user_tags.add(UserTag(user_id=user_id, tag_id=tag.id))
        await self.session.commit()
        return tags

    async def set_room_tags(self, room_id: UUID, labels: list[str]) -> list[Tag]:
        tags = await self._ensure_tags(labels)
        await self.room_tags.delete_by(room_id=room_id)
        for tag in tags:
            await self.room_tags.add(RoomTag(room_id=room_id, tag_id=tag.id))
        return tags

    async def _ensure_tags(self, labels: list[str]) -> list[Tag]:
        if not labels:
            return []
        normalized: dict[str, str] = {}
        for raw in labels:
            slug = _slugify(raw)
            if not slug:
                continue
            normalized.setdefault(slug, raw.strip())
        if not normalized:
            return []
        existing = {t.slug: t for t in await self.tags.list_by_slugs(list(normalized))}
        result: list[Tag] = []
        for slug, label in normalized.items():
            tag = existing.get(slug)
            if tag is None:
                tag = Tag(slug=slug, label=label[:40])
                await self.tags.add(tag)
                existing[slug] = tag
            result.append(tag)
        return result
