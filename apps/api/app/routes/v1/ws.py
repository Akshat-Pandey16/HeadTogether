from __future__ import annotations

import asyncio
from collections import defaultdict
from contextlib import suppress
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import async_sessionmaker
from starlette.websockets import WebSocketState

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.db.session import SessionFactory
from app.realtime.broker import get_broker, user_channel
from app.realtime.events import WsEvent
from app.realtime.manager import ConnectionManager
from app.repositories.room import RoomMemberRepository, RoomRepository
from app.services.auth import AuthService
from app.services.message import MessageService
from app.utils.time import utc_now

router = APIRouter(prefix="/ws", tags=["realtime"])
log = get_logger(__name__)

_manager: ConnectionManager | None = None
_session_factory: async_sessionmaker = SessionFactory
_user_connections: dict[UUID, set[WebSocket]] = defaultdict(set)
_user_lock = asyncio.Lock()


def init_manager() -> ConnectionManager:
    global _manager  # noqa: PLW0603
    if _manager is None:
        _manager = ConnectionManager(get_broker())
    return _manager


async def shutdown_manager() -> None:
    if _manager is not None:
        await _manager.shutdown()


def get_manager() -> ConnectionManager:
    if _manager is None:
        raise RuntimeError("ConnectionManager not initialised")
    return _manager


async def _register_user_connection(user_id: UUID, websocket: WebSocket) -> WebSocket | None:
    async with _user_lock:
        connections = _user_connections[user_id]
        evicted: WebSocket | None = None
        if len(connections) >= settings.ws_max_connections_per_user:
            evicted = next(iter(connections))
            connections.discard(evicted)
        connections.add(websocket)
        return evicted


async def _unregister_user_connection(user_id: UUID, websocket: WebSocket) -> None:
    async with _user_lock:
        connections = _user_connections.get(user_id)
        if connections is None:
            return
        connections.discard(websocket)
        if not connections:
            _user_connections.pop(user_id, None)


@router.websocket("/rooms/{room_id}")
async def room_socket(
    websocket: WebSocket,
    room_id: UUID,
    token: str = Query(...),
    since_message_id: UUID | None = Query(default=None),
) -> None:
    manager = get_manager()
    broker = get_broker()

    async with _session_factory() as session:
        try:
            user = await AuthService(session).get_current_user(token)
            room = await RoomRepository(session).get_active(room_id)
            if room is None:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="room_not_found")
                return
            if not await RoomMemberRepository(session).is_active_member(room_id, user.id):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="not_member")
                return
            recovery: list[dict] = []
            recovery_truncated = False
            if since_message_id is not None:
                messages, recovery_truncated = await MessageService(session).list_for_recovery(
                    room_id=room_id, actor_id=user.id, since_message_id=since_message_id
                )
                recovery = [m.model_dump(mode="json") for m in messages]
        except AppError as exc:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=exc.code)
            return

    await websocket.accept()
    evicted = await _register_user_connection(user.id, websocket)
    if evicted is not None:
        with suppress(Exception):
            await evicted.send_json(
                {
                    "type": WsEvent.ERROR.value,
                    "data": {"code": "connection_replaced"},
                }
            )
        with suppress(Exception):
            await evicted.close(code=4001)

    if recovery or recovery_truncated:
        with suppress(Exception):
            await websocket.send_json(
                {
                    "type": "recovery",
                    "data": {
                        "messages": recovery,
                        "since_message_id": str(since_message_id),
                        "truncated": recovery_truncated,
                    },
                }
            )

    await manager.attach(room_id=room_id, websocket=websocket)
    await broker.presence_join(str(room_id), str(user.id))
    await manager.broadcast(
        room_id,
        {"type": WsEvent.PRESENCE_JOINED.value, "data": {"user_id": str(user.id)}},
    )

    pong = _PongTracker()
    heartbeat_task = asyncio.create_task(_heartbeat(websocket, pong))
    try:
        while True:
            payload = await websocket.receive_json()
            event = payload.get("type")
            if event == WsEvent.TYPING_START.value:
                await broker.typing_set(str(room_id), str(user.id))
                await manager.broadcast(
                    room_id,
                    {
                        "type": WsEvent.TYPING_START.value,
                        "data": {
                            "user_id": str(user.id),
                            "first_name": user.first_name,
                            "at": utc_now().isoformat(),
                        },
                    },
                )
            elif event == WsEvent.TYPING_STOP.value:
                await broker.typing_clear(str(room_id), str(user.id))
                await manager.broadcast(
                    room_id,
                    {
                        "type": WsEvent.TYPING_STOP.value,
                        "data": {"user_id": str(user.id)},
                    },
                )
            elif event == WsEvent.PONG.value:
                pong.mark()
                continue
            else:
                with suppress(Exception):
                    await websocket.send_json(
                        {
                            "type": WsEvent.ERROR.value,
                            "data": {"code": "unknown_event"},
                        }
                    )
    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("ws.unhandled_exception")
    finally:
        heartbeat_task.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat_task
        await _unregister_user_connection(user.id, websocket)
        await broker.typing_clear(str(room_id), str(user.id))
        await broker.presence_leave(str(room_id), str(user.id))
        await manager.detach(room_id=room_id, websocket=websocket)
        await manager.broadcast(
            room_id,
            {"type": WsEvent.PRESENCE_LEFT.value, "data": {"user_id": str(user.id)}},
        )
        if websocket.application_state is WebSocketState.CONNECTED:
            with suppress(Exception):
                await websocket.close()


class _PongTracker:
    __slots__ = ("last_seen",)

    def __init__(self) -> None:
        self.last_seen = asyncio.get_running_loop().time()

    def mark(self) -> None:
        self.last_seen = asyncio.get_running_loop().time()


async def _heartbeat(websocket: WebSocket, pong: _PongTracker) -> None:
    interval = settings.ws_heartbeat_interval_seconds
    deadline = interval * 2.5
    try:
        while True:
            await asyncio.sleep(interval)
            if websocket.application_state is not WebSocketState.CONNECTED:
                break
            if asyncio.get_running_loop().time() - pong.last_seen > deadline:
                with suppress(Exception):
                    await websocket.close(code=4002)
                break
            with suppress(Exception):
                await websocket.send_json({"type": WsEvent.PING.value, "data": {}})
    except asyncio.CancelledError:
        pass


@router.websocket("/me")
async def user_socket(websocket: WebSocket, token: str = Query(...)) -> None:
    broker = get_broker()
    async with _session_factory() as session:
        try:
            user = await AuthService(session).get_current_user(token)
        except AppError as exc:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=exc.code)
            return

    await websocket.accept()
    evicted = await _register_user_connection(user.id, websocket)
    if evicted is not None:
        with suppress(Exception):
            await evicted.send_json(
                {
                    "type": WsEvent.ERROR.value,
                    "data": {"code": "connection_replaced"},
                }
            )
        with suppress(Exception):
            await evicted.close(code=4001)

    subscription = await broker.subscribe(user_channel(str(user.id)))
    pong = _PongTracker()
    heartbeat_task = asyncio.create_task(_heartbeat(websocket, pong))
    fanout_task = asyncio.create_task(_fanout_to_socket(subscription, websocket))
    try:
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") == WsEvent.PONG.value:
                pong.mark()
                continue
            with suppress(Exception):
                await websocket.send_json(
                    {
                        "type": WsEvent.ERROR.value,
                        "data": {"code": "unknown_event"},
                    }
                )
    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("ws.user.unhandled_exception")
    finally:
        heartbeat_task.cancel()
        fanout_task.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat_task
        with suppress(asyncio.CancelledError):
            await fanout_task
        await subscription.close()
        await _unregister_user_connection(user.id, websocket)
        if websocket.application_state is WebSocketState.CONNECTED:
            with suppress(Exception):
                await websocket.close()


async def _fanout_to_socket(subscription, websocket: WebSocket) -> None:
    try:
        async for event in subscription:
            if websocket.client_state is not WebSocketState.CONNECTED:
                break
            with suppress(Exception):
                await websocket.send_json(event)
    except asyncio.CancelledError:
        pass
