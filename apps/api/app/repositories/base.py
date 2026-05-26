from __future__ import annotations

from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import Select, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class AsyncRepository[ModelT: Base]:
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, instance: ModelT) -> ModelT:
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def get(self, pk: UUID) -> ModelT | None:
        return await self.session.get(self.model, pk)

    async def get_by(self, **filters: Any) -> ModelT | None:
        stmt = self._where(select(self.model), filters).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def exists(self, **filters: Any) -> bool:
        stmt = self._where(select(func.count()).select_from(self.model), filters)
        result = await self.session.execute(stmt)
        return (result.scalar_one() or 0) > 0

    async def list(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        order_by: Any | None = None,
        **filters: Any,
    ) -> list[ModelT]:
        stmt = self._where(select(self.model), filters).limit(limit).offset(offset)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self, **filters: Any) -> int:
        stmt = self._where(select(func.count()).select_from(self.model), filters)
        result = await self.session.execute(stmt)
        return int(result.scalar_one() or 0)

    async def delete(self, instance: ModelT) -> None:
        await self.session.delete(instance)
        await self.session.flush()

    async def delete_by(self, **filters: Any) -> int:
        stmt = self._where(delete(self.model), filters)
        result = await self.session.execute(stmt)
        return result.rowcount or 0

    def _where(self, stmt: Select[Any] | Any, filters: dict[str, Any]) -> Any:
        for key, value in filters.items():
            stmt = stmt.where(getattr(self.model, key) == value)
        return stmt
