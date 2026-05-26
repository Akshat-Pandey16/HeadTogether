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
from app.realtime.broker import get_broker, room_channel
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
            if since_message_id is not None:
                messages = await MessageService(session).list_for_recovery(
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

    if recovery:
        with suppress(Exception):
            await websocket.send_json(
                {
                    "type": "recovery",
                    "data": {"messages": recovery, "since_message_id": str(since_message_id)},
                }
            )

    await manager.attach(room_id=room_id, websocket=websocket)
    await broker.presence_join(str(room_id), str(user.id))
    await manager.broadcast(
        room_id,
        {"type": WsEvent.PRESENCE_JOINED.value, "data": {"user_id": str(user.id)}},
    )

    heartbeat_task = asyncio.create_task(_heartbeat(websocket))
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


async def _heartbeat(websocket: WebSocket) -> None:
    try:
        while True:
            await asyncio.sleep(settings.ws_heartbeat_interval_seconds)
            if websocket.application_state is not WebSocketState.CONNECTED:
                break
            with suppress(Exception):
                await websocket.send_json({"type": WsEvent.PING.value, "data": {}})
    except asyncio.CancelledError:
        pass


_ = room_channel
