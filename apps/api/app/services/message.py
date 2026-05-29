from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.models.enums import MessageType, NotificationType, RoomStatus
from app.models.message import Message, MessageReaction, RoomReadState
from app.realtime.broker import room_channel
from app.realtime.events import WsEvent
from app.repositories.message import (
    MessageReactionRepository,
    MessageRepository,
    RoomReadStateRepository,
)
from app.repositories.moderation import BlockRepository
from app.repositories.room import RoomMemberRepository, RoomRepository
from app.repositories.user import UserRepository
from app.schemas.common import Page
from app.schemas.message import (
    MarkReadRequest,
    MessageCreate,
    MessageEdit,
    MessageRead,
    ReactionCreate,
    ReactionSummary,
    UnreadResponse,
)
from app.schemas.user import UserPublic
from app.services.notifications import NotificationDraft, NotificationService
from app.utils.time import ensure_utc, utc_now

_MENTION_RE = re.compile(r"@([\w.\-]+@[\w.\-]+\.[\w]+|[\w.\-]{1,80})")
_RECOVERY_CAP = 500
_RECOVERY_BATCH = 200


def _message_sort_key(message: Message) -> tuple[datetime, UUID]:
    created = ensure_utc(message.created_at) or message.created_at
    return (created, message.id)


class MessageService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.messages = MessageRepository(session)
        self.reactions = MessageReactionRepository(session)
        self.read_states = RoomReadStateRepository(session)
        self.members = RoomMemberRepository(session)
        self.rooms = RoomRepository(session)
        self.blocks = BlockRepository(session)
        self.users = UserRepository(session)
        self.notify_service = NotificationService(session)

    async def list_page(
        self,
        *,
        room_id: UUID,
        actor_id: UUID,
        limit: int,
        before_id: UUID | None,
        after_id: UUID | None,
    ) -> Page[MessageRead]:
        await self._ensure_member(room_id, actor_id)
        items = await self.messages.page(
            room_id=room_id, limit=limit, before_id=before_id, after_id=after_id
        )
        blocked = await self.blocks.blocked_either_way(actor_id)
        visible = [self._to_read(m, actor_id, blocked) for m in items]
        total = await self.messages.count_for_room(room_id)
        return Page[MessageRead](items=visible, total=total, limit=limit, offset=0)

    async def search(
        self, *, room_id: UUID, actor_id: UUID, query: str, limit: int
    ) -> list[MessageRead]:
        await self._ensure_member(room_id, actor_id)
        items = await self.messages.search(room_id=room_id, query=query, limit=limit)
        blocked = await self.blocks.blocked_either_way(actor_id)
        return [self._to_read(m, actor_id, blocked) for m in items]

    async def list_pinned(self, *, room_id: UUID, actor_id: UUID) -> list[MessageRead]:
        await self._ensure_member(room_id, actor_id)
        items = await self.messages.list_pinned(room_id)
        blocked = await self.blocks.blocked_either_way(actor_id)
        return [self._to_read(m, actor_id, blocked) for m in items]

    async def post(
        self, *, room_id: UUID, sender_id: UUID, payload: MessageCreate
    ) -> tuple[MessageRead, list[UUID], bool]:
        room = await self._ensure_room_active(room_id)
        await self._ensure_member(room.id, sender_id)
        if payload.client_message_id is not None:
            existing = await self.messages.find_by_idempotency(
                room.id, sender_id, payload.client_message_id
            )
            if existing is not None:
                return self._to_read(existing, sender_id, set()), [], False
        parent_author_id: UUID | None = None
        if payload.parent_message_id is not None:
            parent = await self.messages.get(payload.parent_message_id)
            if parent is None or parent.room_id != room.id or parent.deleted_at is not None:
                raise NotFoundError("Parent message not found", code="parent_not_found")
            parent_author_id = parent.sender_id
        message = Message(
            room_id=room.id,
            sender_id=sender_id,
            body=payload.body,
            parent_message_id=payload.parent_message_id,
            client_message_id=payload.client_message_id,
        )
        try:
            await self.messages.add(message)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            if payload.client_message_id is not None:
                existing = await self.messages.find_by_idempotency(
                    room.id, sender_id, payload.client_message_id
                )
                if existing is not None:
                    return self._to_read(existing, sender_id, set()), [], False
            raise
        await self.session.refresh(message, attribute_names=["sender", "reactions"])
        mentioned = await self._resolve_mentions(payload.body, room_id=room.id)
        preview = message.body[:200]
        drafts = [
            NotificationDraft(
                user_id=uid,
                type=NotificationType.MENTION,
                actor_id=sender_id,
                room_id=room.id,
                message_id=message.id,
                payload={"body": preview},
            )
            for uid in mentioned
        ]
        if parent_author_id is not None and parent_author_id not in set(mentioned):
            drafts.append(
                NotificationDraft(
                    user_id=parent_author_id,
                    type=NotificationType.REPLY,
                    actor_id=sender_id,
                    room_id=room.id,
                    message_id=message.id,
                    payload={"body": preview},
                )
            )
        await self.notify_service.notify_many(drafts)
        read = self._to_read(message, sender_id, set())
        return read, mentioned, True

    async def post_system(
        self,
        *,
        room_id: UUID,
        sender_id: UUID,
        body: str,
    ) -> MessageRead:
        message = Message(
            room_id=room_id,
            sender_id=sender_id,
            body=body,
            message_type=MessageType.SYSTEM,
        )
        await self.messages.add(message)
        await self.session.commit()
        await self.session.refresh(message, attribute_names=["sender", "reactions"])
        return self._to_read(message, sender_id, set())

    async def edit(
        self, *, room_id: UUID, message_id: UUID, actor_id: UUID, payload: MessageEdit
    ) -> MessageRead:
        message = await self._get_message(room_id, message_id)
        if message.sender_id != actor_id:
            raise AuthorizationError("Only the author can edit", code="not_author")
        if message.deleted_at is not None:
            raise ConflictError("Cannot edit a deleted message", code="message_deleted")
        window = timedelta(minutes=settings.message_edit_window_minutes)
        created_at = ensure_utc(message.created_at)
        if created_at is not None and utc_now() - created_at > window:
            raise ConflictError("Edit window has passed", code="edit_window_expired")
        message.body = payload.body
        message.edited_at = utc_now()
        await self.session.commit()
        await self.session.refresh(message, attribute_names=["sender", "reactions"])
        return self._to_read(message, actor_id, set())

    async def delete(self, *, room_id: UUID, message_id: UUID, actor_id: UUID) -> UUID:
        message = await self._get_message(room_id, message_id)
        room = await self._ensure_room_active(room_id)
        is_author = message.sender_id == actor_id
        is_room_owner = room.owner_id == actor_id
        if not (is_author or is_room_owner):
            raise AuthorizationError(
                "Only the author or room owner can delete", code="cannot_delete"
            )
        if message.deleted_at is not None:
            return message.id
        message.deleted_at = utc_now()
        message.body = ""
        await self.session.commit()
        return message.id

    async def add_reaction(
        self,
        *,
        room_id: UUID,
        message_id: UUID,
        actor_id: UUID,
        payload: ReactionCreate,
    ) -> MessageReaction:
        message = await self._get_message(room_id, message_id)
        if message.deleted_at is not None:
            raise ConflictError("Cannot react to a deleted message", code="message_deleted")
        await self._ensure_member(room_id, actor_id)
        existing = await self.reactions.get_reaction(message.id, actor_id, payload.emoji)
        if existing is not None:
            return existing
        reaction = MessageReaction(
            message_id=message.id,
            user_id=actor_id,
            emoji=payload.emoji,
            created_at=utc_now(),
        )
        try:
            await self.reactions.add(reaction)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            duplicate = await self.reactions.get_reaction(message.id, actor_id, payload.emoji)
            if duplicate is not None:
                return duplicate
            raise
        if message.sender_id != actor_id:
            await self.notify_service.notify(
                user_id=message.sender_id,
                type=NotificationType.REACTION,
                actor_id=actor_id,
                room_id=message.room_id,
                message_id=message.id,
                payload={"emoji": payload.emoji},
            )
        return reaction

    async def remove_reaction(
        self,
        *,
        room_id: UUID,
        message_id: UUID,
        actor_id: UUID,
        emoji: str,
    ) -> bool:
        message = await self._get_message(room_id, message_id)
        existing = await self.reactions.get_reaction(message.id, actor_id, emoji)
        if existing is None:
            return False
        await self.reactions.delete(existing)
        await self.session.commit()
        return True

    async def pin(self, *, room_id: UUID, message_id: UUID, actor_id: UUID) -> MessageRead:
        room = await self._ensure_room_active(room_id)
        if room.owner_id != actor_id:
            raise AuthorizationError("Only the room owner can pin", code="not_owner")
        message = await self._get_message(room_id, message_id)
        if message.deleted_at is not None:
            raise ConflictError("Cannot pin a deleted message", code="message_deleted")
        if message.pinned_at is None:
            message.pinned_at = utc_now()
            message.pinned_by_id = actor_id
            await self.session.commit()
            await self.session.refresh(message, attribute_names=["sender", "reactions"])
        return self._to_read(message, actor_id, set())

    async def unpin(self, *, room_id: UUID, message_id: UUID, actor_id: UUID) -> UUID:
        room = await self._ensure_room_active(room_id)
        if room.owner_id != actor_id:
            raise AuthorizationError("Only the room owner can unpin", code="not_owner")
        message = await self._get_message(room_id, message_id)
        if message.pinned_at is not None:
            message.pinned_at = None
            message.pinned_by_id = None
            await self.session.commit()
        return message.id

    async def mark_read(
        self, *, room_id: UUID, actor_id: UUID, payload: MarkReadRequest
    ) -> RoomReadState:
        await self._ensure_member(room_id, actor_id)
        message = await self.messages.get(payload.up_to_message_id)
        if message is None or message.room_id != room_id:
            raise NotFoundError("Message not found in this room", code="message_not_found")
        state = await self.read_states.get_for(room_id, actor_id) or RoomReadState(
            room_id=room_id, user_id=actor_id
        )
        if state.last_read_message_id is not None:
            current = await self.messages.get(state.last_read_message_id)
            if current is not None and _message_sort_key(current) >= _message_sort_key(message):
                return state
        state.last_read_message_id = message.id
        state.last_read_at = utc_now()
        if state not in self.session:
            self.session.add(state)
        await self.session.commit()
        return state

    async def unread(self, *, room_id: UUID, actor_id: UUID) -> UnreadResponse:
        await self._ensure_member(room_id, actor_id)
        state = await self.read_states.get_for(room_id, actor_id)
        anchor_at = None
        last_read_message_id = None
        last_read_at = None
        if state is not None:
            last_read_message_id = state.last_read_message_id
            last_read_at = state.last_read_at
            if state.last_read_message_id is not None:
                anchor = await self.messages.get(state.last_read_message_id)
                if anchor is not None:
                    anchor_at = anchor.created_at
        count = await self.messages.count_unread(
            room_id=room_id, after_created_at_exclusive=anchor_at
        )
        return UnreadResponse(
            count=count,
            last_read_message_id=last_read_message_id,
            last_read_at=last_read_at,
        )

    def _to_read(
        self, message: Message, actor_id: UUID, blocked_user_ids: set[UUID]
    ) -> MessageRead:
        reactions = self._summarise_reactions(message, actor_id)
        is_blocked = message.sender_id in blocked_user_ids
        body = "" if message.deleted_at is not None or is_blocked else message.body
        return MessageRead(
            id=message.id,
            room_id=message.room_id,
            sender=UserPublic.model_validate(message.sender),
            body=body,
            message_type=message.message_type,
            parent_message_id=message.parent_message_id,
            client_message_id=message.client_message_id,
            edited_at=message.edited_at,
            deleted_at=message.deleted_at,
            pinned_at=message.pinned_at,
            reactions=reactions,
            created_at=message.created_at,
        )

    @staticmethod
    def _summarise_reactions(message: Message, actor_id: UUID) -> list[ReactionSummary]:
        counts: dict[str, int] = defaultdict(int)
        mine: set[str] = set()
        for r in message.reactions:
            counts[r.emoji] += 1
            if r.user_id == actor_id:
                mine.add(r.emoji)
        return [
            ReactionSummary(emoji=emoji, count=count, reacted_by_me=emoji in mine)
            for emoji, count in sorted(counts.items())
        ]

    async def _get_message(self, room_id: UUID, message_id: UUID) -> Message:
        message = await self.messages.get_visible(message_id)
        if message is None or message.room_id != room_id:
            raise NotFoundError("Message not found", code="message_not_found")
        return message

    async def _ensure_room_active(self, room_id: UUID):
        room = await self.rooms.get_active(room_id)
        if room is None:
            raise NotFoundError("Room not found", code="room_not_found")
        if room.status != RoomStatus.ACTIVE:
            raise ConflictError("Room is not active", code="room_inactive")
        now = utc_now()
        expires_at = ensure_utc(room.expires_at)
        if expires_at is not None and expires_at <= now:
            raise ConflictError("Room has expired", code="room_expired")
        ends_at = ensure_utc(room.ends_at)
        if ends_at is not None and ends_at <= now:
            raise ConflictError("Room has ended", code="room_ended")
        return room

    async def _ensure_member(self, room_id: UUID, user_id: UUID) -> None:
        if not await self.members.is_active_member(room_id, user_id):
            raise AuthorizationError("Not a member of this room", code="not_member")

    async def _resolve_mentions(self, body: str, *, room_id: UUID) -> list[UUID]:
        handles = {m.group(1).lower() for m in _MENTION_RE.finditer(body or "")}
        if not handles:
            return []
        mentioned: list[UUID] = []
        for handle in handles:
            user = await self.users.get_by(email=handle)
            if user is None:
                continue
            if not await self.members.is_active_member(room_id, user.id):
                continue
            mentioned.append(user.id)
        return mentioned

    async def list_for_recovery(
        self, *, room_id: UUID, actor_id: UUID, since_message_id: UUID
    ) -> tuple[list[MessageRead], bool]:
        await self._ensure_member(room_id, actor_id)
        anchor = await self.messages.get(since_message_id)
        if anchor is None or anchor.room_id != room_id:
            return [], False
        cursor_created, cursor_id = _message_sort_key(anchor)
        collected: list[Message] = []
        truncated = False
        while True:
            rows = await self.messages.page_after_asc(
                room_id=room_id,
                after_created_at=cursor_created,
                after_id=cursor_id,
                limit=_RECOVERY_BATCH,
            )
            collected.extend(rows)
            if len(rows) < _RECOVERY_BATCH:
                break
            if len(collected) >= _RECOVERY_CAP:
                truncated = True
                collected = collected[:_RECOVERY_CAP]
                break
            cursor_created, cursor_id = _message_sort_key(rows[-1])
        blocked = await self.blocks.blocked_either_way(actor_id)
        return [self._to_read(m, actor_id, blocked) for m in collected], truncated

    @staticmethod
    def channel_for(room_id: UUID) -> str:
        return room_channel(str(room_id))

    @staticmethod
    def event(event: WsEvent, data: dict | None = None) -> dict:
        return {"type": event.value, "data": data or {}}
