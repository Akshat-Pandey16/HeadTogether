from __future__ import annotations

import asyncio
import json
from abc import ABC, abstractmethod
from collections import defaultdict
from collections.abc import AsyncIterator
from typing import Any

from redis import asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

_TYPING_KEY_PREFIX = "ht:typing"
_PRESENCE_KEY_PREFIX = "ht:presence"


class Broker(ABC):
    @abstractmethod
    async def publish(self, channel: str, event: dict[str, Any]) -> None: ...

    @abstractmethod
    def subscribe(self, channel: str) -> BrokerSubscription: ...

    @abstractmethod
    async def presence_join(self, room_id: str, user_id: str) -> None: ...

    @abstractmethod
    async def presence_leave(self, room_id: str, user_id: str) -> None: ...

    @abstractmethod
    async def presence_list(self, room_id: str) -> set[str]: ...

    @abstractmethod
    async def typing_set(self, room_id: str, user_id: str) -> None: ...

    @abstractmethod
    async def typing_clear(self, room_id: str, user_id: str) -> None: ...

    @abstractmethod
    async def typing_list(self, room_id: str) -> set[str]: ...

    async def close(self) -> None:
        return None


class BrokerSubscription(ABC):
    @abstractmethod
    def __aiter__(self) -> AsyncIterator[dict[str, Any]]: ...

    @abstractmethod
    async def close(self) -> None: ...


class InMemoryBroker(Broker):
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
        self._presence: dict[str, set[str]] = defaultdict(set)
        self._typing: dict[str, dict[str, asyncio.TimerHandle]] = defaultdict(dict)

    async def publish(self, channel: str, event: dict[str, Any]) -> None:
        for queue in list(self._subscribers.get(channel, ())):
            queue.put_nowait(event)

    def subscribe(self, channel: str) -> BrokerSubscription:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._subscribers[channel].add(queue)
        return _InMemorySubscription(self, channel, queue)

    async def presence_join(self, room_id: str, user_id: str) -> None:
        self._presence[room_id].add(user_id)

    async def presence_leave(self, room_id: str, user_id: str) -> None:
        self._presence[room_id].discard(user_id)
        if not self._presence[room_id]:
            self._presence.pop(room_id, None)

    async def presence_list(self, room_id: str) -> set[str]:
        return set(self._presence.get(room_id, ()))

    async def typing_set(self, room_id: str, user_id: str) -> None:
        existing = self._typing[room_id].pop(user_id, None)
        if existing is not None:
            existing.cancel()
        loop = asyncio.get_running_loop()
        self._typing[room_id][user_id] = loop.call_later(
            settings.typing_ttl_seconds, self._auto_clear_typing, room_id, user_id
        )

    async def typing_clear(self, room_id: str, user_id: str) -> None:
        handle = self._typing.get(room_id, {}).pop(user_id, None)
        if handle is not None:
            handle.cancel()

    async def typing_list(self, room_id: str) -> set[str]:
        return set(self._typing.get(room_id, {}).keys())

    def _auto_clear_typing(self, room_id: str, user_id: str) -> None:
        self._typing.get(room_id, {}).pop(user_id, None)


class _InMemorySubscription(BrokerSubscription):
    def __init__(
        self,
        broker: InMemoryBroker,
        channel: str,
        queue: asyncio.Queue[dict[str, Any]],
    ) -> None:
        self._broker = broker
        self._channel = channel
        self._queue = queue

    def __aiter__(self) -> AsyncIterator[dict[str, Any]]:
        return self._iter()

    async def _iter(self) -> AsyncIterator[dict[str, Any]]:
        while True:
            event = await self._queue.get()
            yield event

    async def close(self) -> None:
        subs = self._broker._subscribers.get(self._channel)
        if subs is not None:
            subs.discard(self._queue)


class RedisBroker(Broker):
    def __init__(self, redis: aioredis.Redis) -> None:
        self._redis = redis

    async def publish(self, channel: str, event: dict[str, Any]) -> None:
        await self._redis.publish(channel, json.dumps(event))

    def subscribe(self, channel: str) -> BrokerSubscription:
        pubsub = self._redis.pubsub()
        return _RedisSubscription(pubsub, channel)

    async def presence_join(self, room_id: str, user_id: str) -> None:
        key = f"{_PRESENCE_KEY_PREFIX}:{room_id}"
        await self._redis.sadd(key, user_id)
        await self._redis.expire(key, settings.presence_ttl_seconds)

    async def presence_leave(self, room_id: str, user_id: str) -> None:
        key = f"{_PRESENCE_KEY_PREFIX}:{room_id}"
        await self._redis.srem(key, user_id)

    async def presence_list(self, room_id: str) -> set[str]:
        members = await self._redis.smembers(f"{_PRESENCE_KEY_PREFIX}:{room_id}")
        return {m if isinstance(m, str) else m.decode() for m in members}

    async def typing_set(self, room_id: str, user_id: str) -> None:
        key = f"{_TYPING_KEY_PREFIX}:{room_id}:{user_id}"
        await self._redis.set(key, "1", ex=settings.typing_ttl_seconds)

    async def typing_clear(self, room_id: str, user_id: str) -> None:
        await self._redis.delete(f"{_TYPING_KEY_PREFIX}:{room_id}:{user_id}")

    async def typing_list(self, room_id: str) -> set[str]:
        cursor = 0
        out: set[str] = set()
        pattern = f"{_TYPING_KEY_PREFIX}:{room_id}:*"
        while True:
            cursor, keys = await self._redis.scan(cursor=cursor, match=pattern, count=100)
            for key in keys:
                k = key if isinstance(key, str) else key.decode()
                out.add(k.split(":")[-1])
            if cursor == 0:
                break
        return out

    async def close(self) -> None:
        await self._redis.aclose()


class _RedisSubscription(BrokerSubscription):
    def __init__(self, pubsub: aioredis.client.PubSub, channel: str) -> None:
        self._pubsub = pubsub
        self._channel = channel
        self._subscribed = False

    def __aiter__(self) -> AsyncIterator[dict[str, Any]]:
        return self._iter()

    async def _iter(self) -> AsyncIterator[dict[str, Any]]:
        if not self._subscribed:
            await self._pubsub.subscribe(self._channel)
            self._subscribed = True
        async for raw in self._pubsub.listen():
            if raw.get("type") != "message":
                continue
            payload = raw.get("data")
            if payload is None:
                continue
            if isinstance(payload, bytes):
                payload = payload.decode()
            try:
                yield json.loads(payload)
            except (TypeError, ValueError):
                log.warning("broker.malformed_event", channel=self._channel)

    async def close(self) -> None:
        try:
            await self._pubsub.unsubscribe(self._channel)
        finally:
            await self._pubsub.aclose()


_broker: Broker | None = None


async def init_broker() -> Broker:
    global _broker  # noqa: PLW0603
    if _broker is not None:
        return _broker
    if settings.redis_url:
        client: aioredis.Redis = aioredis.from_url(
            settings.redis_url, decode_responses=True, encoding="utf-8"
        )
        await client.ping()
        _broker = RedisBroker(client)
        log.info("broker.init", impl="redis", url=settings.redis_url)
    else:
        _broker = InMemoryBroker()
        log.info("broker.init", impl="in_memory")
    return _broker


async def close_broker() -> None:
    global _broker  # noqa: PLW0603
    if _broker is not None:
        await _broker.close()
        _broker = None


def get_broker() -> Broker:
    if _broker is None:
        raise RuntimeError("Broker is not initialized; call init_broker() first")
    return _broker


def room_channel(room_id: str) -> str:
    return f"ht:room:{room_id}"
