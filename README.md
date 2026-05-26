# HeadTogether

> Find people doing things nearby. Create a geo-bounded room around your location and connect with anyone within range — for a movie, a pickup game, a coffee, a walk, a ride share, or just a chat.

A modern, full-stack social app built around **geo-bounded rooms**: ephemeral chat spaces anchored to a real-world location with a radius. Only users physically within range can discover and join the room. Includes realtime chat with reactions, replies, pins, typing indicators, presence, mentions, DMs, in-app notifications, moderation, and waitlists.

The current codebase is a clean rewrite of a 2023 hackathon project, modernized end-to-end for May 2026.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Layout](#project-layout)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Common Tasks](#common-tasks)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Realtime Protocol](#realtime-protocol)
- [Development Notes](#development-notes)
- [License](#license)

---

## Features

### Rooms & discovery
- Create rooms anchored to your live location with a configurable radius (0.1–200 km)
- Discover **nearby** rooms ranked by distance, member count, or recency
- Full-text search across name, description, and tags
- Public, private (invite-only via 12-char code), and DM visibility
- Save rooms for later · view joined / owned / past / saved lists
- Room schedule (`starts_at`, `ends_at`, `expires_at`)
- Custom purposes beyond the built-in `play / movie / travel / chat / landmark`
- Soft delete with 7-day restore window · archive · transfer ownership
- Capacity enforcement with **automatic waitlist promotion**
- Geo privacy: non-members see coordinates rounded to ~1 km precision
- Audit trail of every room event (joined, kicked, promoted, archived, …)

### Realtime chat
- WebSocket-driven messages with **idempotent send** via `client_message_id`
- Reactions, replies (threaded parent reference), edits (15-minute window), soft deletes
- Pinned messages · per-room search · cursor-based pagination
- Typing indicators · presence join/leave · read receipts
- **@-mentions** with email-style support → push notification to mentioned users
- Reconnect with cursor-based recovery (`since_message_id`) — no missed messages
- Backend broadcasts all member lifecycle events for live UI updates

### People & profiles
- Public profile (name, age, gender, bio, avatar, interest tags)
- Per-user interest tags · DMs · block / unblock · report (spam, harassment, etc.)

### Notifications
- Persistent notifications + WebSocket push on a per-user channel (`/ws/me`)
- Types: mention, reaction, reply, DM, kicked, promoted, demoted, waitlist-promoted, ownership transfer, room archived/deleted
- REST endpoints for list, unread count, mark-read, mark-all-read
- Device-token registration scaffold (FCM/APNs transport not wired in this build)

### Security & ops
- Email + password registration with Argon2id hashing (`pwdlib`)
- JWT access + refresh tokens, **refresh-token rotation** with family-based reuse detection
- Login brute-force protection (lockout after N failed attempts)
- Password reset via opaque, hashed, single-use tokens
- Per-route rate limiting via `slowapi` (Redis-backed when available)
- Structured colored logs in dev, JSON in prod
- Periodic background jobs (separate process): expire rooms, hard-delete past restore window, purge revoked refresh tokens

---

## Tech Stack

### Backend (`apps/api`)
- **Python 3.13** · **FastAPI 0.136** · **Pydantic 2.13** · **SQLAlchemy 2.0** (async, typed `Mapped[]`)
- **SQLite** (aiosqlite) for local dev — swappable to Postgres via `DATABASE_URL`
- **Alembic** migrations with async env, ruff post-write hook
- **PyJWT** (HS256) for tokens, **Argon2id** via `pwdlib` for passwords
- **Redis** 8 for pub/sub broker + presence + typing TTL + rate-limit storage
- **APScheduler** for periodic jobs (runs as a separate process)
- **structlog** for logs, **slowapi** for rate limits
- **uv** for dependency management, **ruff** + **ty** for lint/format/typecheck

### Frontend (`apps/web`)
- **React 19.2** · **Vite 8** · **TypeScript 6** · **Tailwind 4** (CSS-first, Vite plugin)
- **TanStack Query 5** for data, **Zustand 5** for client state
- **React Router 7** for routing, **react-hook-form 7** + **zod 4** for forms
- **Radix UI** primitives + shadcn-style component layer
- **lucide-react** icons, **date-fns** for time formatting
- **Bun** workspace + lockfile

---

## Project Layout

```
HeadTogether/
├── apps/
│   ├── api/                          # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/                 # config, security, logging, exceptions, middleware
│   │   │   ├── db/                   # base classes, async session factory
│   │   │   ├── deps.py               # FastAPI dependency-injection helpers
│   │   │   ├── jobs/                 # APScheduler entrypoint + job definitions
│   │   │   ├── main.py               # FastAPI app factory + lifespan
│   │   │   ├── models/               # SQLAlchemy ORM models (20 tables)
│   │   │   ├── realtime/             # broker (Redis/in-memory), WS connection manager, events
│   │   │   ├── repositories/         # data-access layer
│   │   │   ├── routes/v1/            # HTTP route modules + router aggregation
│   │   │   ├── schemas/              # Pydantic models (request/response)
│   │   │   ├── services/             # business logic (auth, room, message, …)
│   │   │   └── utils/                # time, request helpers
│   │   ├── migrations/               # Alembic env + version scripts
│   │   ├── alembic.ini
│   │   ├── docker-compose.yml        # Redis service
│   │   ├── Dockerfile
│   │   ├── Makefile                  # backend-only convenience targets
│   │   └── pyproject.toml
│   └── web/                          # React frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/           # AppLayout, ChatLayout, TopNav, ProtectedRoute
│       │   │   ├── shared/           # UserAvatar, LoadingPage, EmptyState, ErrorBoundary
│       │   │   └── ui/               # shadcn-style primitives (Button, Dialog, …)
│       │   ├── features/             # feature-scoped pages, queries, sockets
│       │   │   ├── auth/             # login, register, forgot/reset password
│       │   │   ├── chat/             # message list, composer, item, room socket
│       │   │   ├── dms/              # direct message conversations
│       │   │   ├── notifications/    # panel + user socket
│       │   │   ├── profile/          # profile + settings pages
│       │   │   └── rooms/            # list, detail, create dialog, members panel
│       │   ├── hooks/                # useGeolocation, useDebounce, useMediaQuery
│       │   ├── lib/                  # api client, ws client, env, query client
│       │   ├── providers/            # AuthProvider
│       │   ├── stores/               # Zustand stores
│       │   ├── types/                # TypeScript mirrors of backend schemas
│       │   ├── main.tsx              # entrypoint
│       │   └── router.tsx            # route table
│       ├── components.json
│       ├── eslint.config.js
│       ├── package.json
│       ├── tsconfig*.json
│       └── vite.config.ts
├── bun.lock
├── Makefile                          # top-level orchestration (use this!)
├── package.json                      # bun workspace manifest
└── README.md
```

---

## Quickstart

### Prerequisites

- **Python 3.13+** with [`uv`](https://docs.astral.sh/uv/) installed
- **Node 22+** with [`bun`](https://bun.sh) installed
- **Docker** (for Redis) — or skip Redis to use the in-memory broker

### Setup

```bash
# 1. Install dependencies (backend + frontend)
make install

# 2. Start Redis (optional but recommended)
make redis-up

# 3. Apply database migrations (creates ./apps/api/headtogether.db)
make migrate

# 4. Run everything (api + scheduler + web concurrently)
make dev
```

Then open:

- Web app — **http://localhost:5173**
- API — **http://localhost:8000**
- OpenAPI docs — **http://localhost:8000/docs**

### Mobile / LAN testing

Geolocation requires HTTPS on non-localhost origins. Use:

```bash
make dev-web-https
```

Vite will serve a self-signed cert. On your phone, visit `https://<your-lan-ip>:5173`, accept the security warning once, and geolocation will work.

---

## Configuration

### Backend (`apps/api/.env`)

```bash
APP_NAME=HeadTogether
APP_ENV=development           # development | staging | production | test
APP_DEBUG=true
APP_HOST=0.0.0.0
APP_PORT=8000

DATABASE_URL=sqlite+aiosqlite:///./headtogether.db
DATABASE_ECHO=false

JWT_SECRET_KEY=<openssl rand -base64 48>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_TTL_MINUTES=30
JWT_REFRESH_TOKEN_TTL_DAYS=14

LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
PASSWORD_RESET_TOKEN_TTL_MINUTES=60

RATE_LIMIT_LOGIN=10/minute
RATE_LIMIT_REGISTER=5/minute
RATE_LIMIT_FORGOT_PASSWORD=5/minute
RATE_LIMIT_SEND_MESSAGE=30/minute

REDIS_URL=redis://127.0.0.1:6379/0   # omit to use the in-memory broker
PRESENCE_TTL_SECONDS=30
TYPING_TTL_SECONDS=8
WS_HEARTBEAT_INTERVAL_SECONDS=20
WS_MAX_CONNECTIONS_PER_USER=5
MESSAGE_EDIT_WINDOW_MINUTES=15

CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOW_ORIGIN_REGEX=^https?://(localhost|127\.0\.0\.1|10\.[0-9.]+|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9.]+|192\.168\.[0-9.]+)(:\d+)?$

LOG_LEVEL=INFO
LOG_JSON=false                # true → JSON logs for prod
```

### Frontend (`apps/web/.env`)

```bash
# Relative URLs use Vite's proxy in dev and work from any host.
VITE_API_BASE_URL=/api/v1
VITE_WS_BASE_URL=/api/v1

# For production, set absolute URLs:
# VITE_API_BASE_URL=https://api.example.com/api/v1
# VITE_WS_BASE_URL=wss://api.example.com/api/v1
```

---

## Common Tasks

Run `make help` for the full menu. Most-used:

| Command                    | What it does                                                |
| -------------------------- | ----------------------------------------------------------- |
| `make install`             | Install backend (uv) + frontend (bun) dependencies          |
| `make dev`                 | Run api + scheduler + web concurrently                      |
| `make dev-api`             | Run the FastAPI server (`uvicorn --reload`, port 8000)      |
| `make dev-scheduler`       | Run the APScheduler worker in a separate process            |
| `make dev-web`             | Run the Vite dev server (port 5173)                         |
| `make dev-web-https`       | Vite with self-signed HTTPS (needed for mobile geolocation) |
| `make build`               | Production build (frontend)                                 |
| `make lint`                | Lint both apps                                              |
| `make format`              | Auto-format both apps                                       |
| `make check`               | Full lint + format check + ty + tsc                         |
| `make typecheck-web`       | `tsc -b --noEmit`                                           |
| `make migrate`             | Apply alembic migrations                                    |
| `make revision m="msg"`    | Create a new auto-generated migration                       |
| `make reset-db`            | Drop the SQLite db and re-migrate                           |
| `make redis-up`            | Start Redis via docker-compose                              |
| `make redis-down`          | Stop Redis                                                  |
| `make clean`               | Remove caches in both apps                                  |
| `make clean-all`           | Also remove `node_modules` and `.venv`                      |

---

## Architecture

### Backend layering

```
HTTP request
    ↓
app/routes/v1/<resource>.py          ← thin FastAPI route handlers
    ↓                                  (only orchestration + serialization)
app/services/<resource>.py           ← business logic, validation, side effects
    ↓
app/repositories/<resource>.py       ← all SQLAlchemy queries live here
    ↓
app/models/<resource>.py             ← typed ORM definitions
    ↓
SQLite / Postgres
```

Cross-cutting:
- **app/realtime/broker.py** — `Broker` interface with `InMemoryBroker` and `RedisBroker` implementations. Provides pub/sub, presence sets, and typing TTL.
- **app/realtime/manager.py** — Per-room `ConnectionManager` that subscribes to the broker once per room and fans out to all attached WebSockets.
- **app/core/middleware.py** — `AccessLogMiddleware` writes a structured `http.request` log line per request with method, path, status, duration.

### Frontend layering

```
src/
├── lib/api/<resource>.ts            ← typed REST clients (one per backend route group)
├── lib/api-client.ts                ← shared fetch wrapper with auto refresh-token rotation
├── lib/ws-client.ts                 ← WebSocket wrapper with reconnect + heartbeat + StrictMode guard
├── features/<feature>/              ← page components + TanStack Query hooks + sockets
└── components/{ui,shared,layout}/   ← presentation
```

Auth flow:
1. `POST /auth/login` returns `{ access_token, refresh_token }`
2. Tokens are persisted to `localStorage` via `tokenStorage`
3. Every request includes `Authorization: Bearer <access_token>`
4. On 401, `api-client` automatically calls `POST /auth/refresh`, swaps the pair, and retries the original request once
5. On refresh failure, the user is signed out and redirected to `/login`

### Realtime fanout

```
client A sends POST /rooms/:id/messages
            ↓
MessageService.post() saves to DB, returns the row
            ↓
route handler calls manager.broadcast(room_id, event)
            ↓
manager publishes to Broker channel "ht:room:<room_id>"
            ↓
Broker (Redis pub/sub or in-memory) fans out to all subscribers
            ↓
each subscriber's _fanout() coroutine receives the event
            ↓
ws.send_json(event) → every connected client in the room
```

This design works across multiple uvicorn workers (Redis fanout) and also in a single-process in-memory mode (no Redis required for local dev).

---

## API Reference

The backend mounts **73 routes** under `/api/v1`. Browse the interactive docs at `http://localhost:8000/docs` once the server is running. Brief overview:

### Auth (`/auth`)
- `POST /register` · `POST /login` · `POST /refresh` · `POST /logout` · `POST /logout-all`
- `POST /change-password` · `POST /forgot-password` · `POST /reset-password`

### Users (`/users`)
- `GET /me` · `PATCH /me` · `DELETE /me`
- `GET /me/tags` · `PUT /me/tags`
- `GET /{user_id}` — public profile

### Rooms (`/rooms`)
- `POST /` · `GET /` (joined) · `GET /owned` · `GET /past` · `GET /saved`
- `GET /search?q=...` · `GET /nearby?latitude=&longitude=&max_distance_km=`
- `POST /join-by-code` · `GET /{room_id}` · `PATCH /{room_id}` · `DELETE /{room_id}`
- `POST /{room_id}/restore` · `POST /{room_id}/archive` · `POST /{room_id}/reactivate`
- `POST /{room_id}/transfer` · `POST /{room_id}/promote` · `POST /{room_id}/demote`
- `POST /{room_id}/rotate-invite`
- `POST /{room_id}/details` · `PATCH /{room_id}/details/{id}` · `DELETE /{room_id}/details/{id}`
- `POST /{room_id}/members` (join with location check) · `GET /{room_id}/members`
- `DELETE /{room_id}/members/me` (leave) · `DELETE /{room_id}/members/{user_id}` (kick)
- `POST /{room_id}/save` · `DELETE /{room_id}/save` · `GET /{room_id}/events`

### Messages (`/rooms/{room_id}/messages`)
- `GET /` · `POST /` · `PATCH /{message_id}` · `DELETE /{message_id}`
- `POST /{message_id}/reactions` · `DELETE /{message_id}/reactions/{emoji}`
- `POST /{message_id}/pin` · `DELETE /{message_id}/pin` · `GET /pinned`
- `GET /search?q=...`
- `POST /rooms/{room_id}/read` · `GET /rooms/{room_id}/unread`

### DMs (`/dms`)
- `POST /` (create or get conversation) · `GET /`

### Moderation (`/moderation`)
- `POST /reports` · `POST /blocks` · `DELETE /blocks/{user_id}`

### Notifications (`/notifications`)
- `GET /` · `GET /unread-count` · `POST /{id}/read` · `POST /read-all`
- `POST /device-tokens` · `DELETE /device-tokens/{token}` · `GET /device-tokens`

### Health
- `GET /health`

---

## Realtime Protocol

### WebSocket endpoints

| Path                      | Purpose                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `/ws/rooms/{room_id}`     | Per-room chat: messages, reactions, typing, presence, member ops   |
| `/ws/me`                  | Per-user push channel: notifications                               |

Authentication is via query param: `?token=<access_token>`.
Optional reconnect cursor on the room socket: `?since_message_id=<uuid>` triggers a `recovery` event with any messages newer than that ID (up to 200).

### Event types

```typescript
// inbound (server → client)
"message.created"     // new message in room
"message.updated"     // edit
"message.deleted"     // soft delete
"message.pinned"      // pin
"message.unpinned"    // unpin
"reaction.added"      // user reacted
"reaction.removed"    // user un-reacted
"read.updated"        // someone's read cursor moved
"typing.start"        // user started typing
"typing.stop"         // user stopped typing
"presence.joined"     // socket connected
"presence.left"       // socket disconnected
"member.joined"       // user joined the room (membership, not socket)
"member.left"         // user left
"member.kicked"       // user was kicked
"room.updated"        // room metadata changed
"room.archived"       // room archived
"room.deleted"        // room deleted
"notification.created"// new notification on /ws/me
"recovery"            // batch of messages after a reconnect
"ping"                // server keepalive
"error"               // protocol error

// outbound (client → server)
"typing.start" · "typing.stop" · "pong"
```

### Reconnect strategy

The client (`apps/web/src/lib/ws-client.ts`) handles:
- Exponential backoff reconnection (1s → 30s cap)
- Heartbeat pong every 25s
- Short open-deferral to absorb React StrictMode mount/unmount cycles
- On reconnect, replays missed messages via `since_message_id`

---

## Development Notes

### Testing on multiple devices

Two clients (e.g. laptop + phone) on the same LAN can join the same room and see each other's messages, reactions, joins, and leaves in real time. The backend's Redis pub/sub fanout handles cross-process delivery. For multiple-worker production deployments, set `REDIS_URL` so events broadcast across workers.

### Geo privacy

For non-members and non-owners, room coordinates returned by the API are rounded to **two decimal places** (~1 km precision). Members and the owner see exact coordinates. This lets discovery work without doxxing the room creator.

### Time zones

The backend stores all times as UTC. The Pydantic `ORMModel` base class coerces any naive datetime to UTC during validation, so JSON responses always ship `…Z` timestamps. The frontend uses `date-fns` and `new Date(...)` which handles UTC→local conversion correctly.

### Known limitations (P2)

- Per-user WebSocket connection cap is per-worker (in-memory state)
- DM create-or-get is not transactional — two simultaneous calls could create duplicates
- Room capacity enforcement is best-effort under concurrent joins
- FCM/APNs push transport is not wired (device-token registration works, but delivery beyond the WS push is a no-op)

### Auth tokens

Access tokens are JWT (HS256) and last 30 minutes by default. Refresh tokens last 14 days, are stored hashed, and use **family-based rotation**: each refresh rotates the token; presenting an old refresh token revokes the entire family (reuse detection). This protects against token theft.

### Logging

Development mode renders structured logs in color with compact timestamps, padded event names, and bright key=value pairs. Production mode (`LOG_JSON=true`) emits one JSON object per log line for ingestion by Loki, Datadog, etc. Every HTTP request gets a structured `http.request` line with method, path, status code, and duration in milliseconds.

---

## License

MIT.
