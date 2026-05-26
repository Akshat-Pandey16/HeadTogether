from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable
from contextlib import suppress
from typing import Any
from uuid import UUID

from fastapi import WebSocket
from starlette.websockets import WebSocketState

from app.core.logging import get_logger
from app.realtime.broker import Broker, room_channel

log = get_logger(__name__)


class ConnectionManager:
    def __init__(self, broker: Broker) -> None:
        self._broker = broker
        self._rooms: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._fanout_tasks: dict[UUID, asyncio.Task[None]] = {}
        self._lock = asyncio.Lock()

    async def attach(self, *, room_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            self._rooms[room_id].add(websocket)
            if room_id not in self._fanout_tasks:
                self._fanout_tasks[room_id] = asyncio.create_task(self._fanout(room_id))

    async def detach(self, *, room_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._rooms.get(room_id)
            if connections is not None:
                connections.discard(websocket)
                if not connections:
                    self._rooms.pop(room_id, None)
                    task = self._fanout_tasks.pop(room_id, None)
                    if task is not None:
                        task.cancel()

    async def broadcast(self, room_id: UUID, event: dict[str, Any]) -> None:
        await self._broker.publish(room_channel(str(room_id)), event)

    async def disconnect_all(self, room_id: UUID, *, reason: str) -> None:
        async with self._lock:
            sockets = list(self._rooms.get(room_id, ()))
        for ws in sockets:
            await _safe_close(ws, reason=reason)
        await self.detach_all(room_id)

    async def detach_all(self, room_id: UUID) -> None:
        async with self._lock:
            self._rooms.pop(room_id, None)
            task = self._fanout_tasks.pop(room_id, None)
            if task is not None:
                task.cancel()

    async def shutdown(self) -> None:
        async with self._lock:
            tasks = list(self._fanout_tasks.values())
            self._fanout_tasks.clear()
        for task in tasks:
            task.cancel()
        for task in tasks:
            with suppress(asyncio.CancelledError):
                await task

    async def _fanout(self, room_id: UUID) -> None:
        channel = room_channel(str(room_id))
        subscription = self._broker.subscribe(channel)
        try:
            async for event in subscription:
                async with self._lock:
                    connections = list(self._rooms.get(room_id, ()))
                if not connections:
                    continue
                await asyncio.gather(
                    *(self._send(ws, event) for ws in connections), return_exceptions=True
                )
        except asyncio.CancelledError:
            pass
        finally:
            await subscription.close()

    async def _send(self, ws: WebSocket, event: dict[str, Any]) -> None:
        if ws.client_state is not WebSocketState.CONNECTED:
            return
        try:
            await ws.send_json(event)
        except Exception:
            log.warning("ws.send_failed")


async def _safe_close(ws: WebSocket, *, reason: str) -> None:
    if ws.application_state is WebSocketState.CONNECTED:
        with suppress(Exception):
            await ws.send_json({"type": "error", "data": {"code": reason}})
        with suppress(Exception):
            await ws.close(code=4000)


SafeAwait = Callable[[], Awaitable[Any]]
