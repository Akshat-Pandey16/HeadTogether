from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.tag import RoomTag, Tag, UserTag
from app.repositories.base import AsyncRepository


class TagRepository(AsyncRepository[Tag]):
    model = Tag

    async def get_by_slug(self, slug: str) -> Tag | None:
        return await self.get_by(slug=slug)

    async def list_by_slugs(self, slugs: list[str]) -> list[Tag]:
        if not slugs:
            return []
        stmt = select(Tag).where(Tag.slug.in_(slugs))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class UserTagRepository(AsyncRepository[UserTag]):
    model = UserTag

    async def list_tags_for_user(self, user_id: UUID) -> list[Tag]:
        stmt = select(UserTag).where(UserTag.user_id == user_id).options(selectinload(UserTag.tag))
        result = await self.session.execute(stmt)
        return [ut.tag for ut in result.scalars().all()]


class RoomTagRepository(AsyncRepository[RoomTag]):
    model = RoomTag

    async def list_tags_for_room(self, room_id: UUID) -> list[Tag]:
        stmt = select(RoomTag).where(RoomTag.room_id == room_id).options(selectinload(RoomTag.tag))
        result = await self.session.execute(stmt)
        return [rt.tag for rt in result.scalars().all()]

    async def tags_for_rooms(self, room_ids: list[UUID]) -> dict[UUID, list[Tag]]:
        if not room_ids:
            return {}
        stmt = (
            select(RoomTag).where(RoomTag.room_id.in_(room_ids)).options(selectinload(RoomTag.tag))
        )
        result = await self.session.execute(stmt)
        grouped: dict[UUID, list[Tag]] = defaultdict(list)
        for rt in result.scalars().all():
            grouped[rt.room_id].append(rt.tag)
        return dict(grouped)
