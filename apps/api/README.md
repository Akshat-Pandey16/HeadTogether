# HeadTogether API

FastAPI + async SQLAlchemy 2.0 + SQLite + JWT (PyJWT) + argon2 (pwdlib).
Managed by `uv`, linted by `ruff`, type-checked by `ty`.

## Layout

```
apps/api/
├── app/
│   ├── api/               HTTP layer (versioned at /api/v1)
│   │   ├── deps.py        Reusable FastAPI dependencies
│   │   └── v1/
│   │       ├── router.py
│   │       └── routes/    auth · users · rooms · messages
│   ├── core/              config · security · logging · exceptions
│   ├── db/                async engine · session factory · declarative base
│   ├── models/            SQLAlchemy 2.0 typed ORM
│   ├── repositories/      Data access (generic AsyncRepository)
│   ├── schemas/           Pydantic v2 DTOs
│   ├── services/          Business logic & transactions
│   └── main.py            App factory + lifespan
├── alembic/               Async migration env
├── alembic.ini
├── pyproject.toml
└── Makefile
```

## Quick start

```bash
cd apps/api
cp .env.example .env
# generate a strong key:  python -c "import secrets; print(secrets.token_urlsafe(48))"

make install
make revision m="init"
make migrate
make dev
```

API docs: <http://localhost:8000/docs>

## Endpoints (v1)

| Method | Path                                  | Description           |
|--------|---------------------------------------|-----------------------|
| POST   | `/api/v1/auth/register`               | Create account        |
| POST   | `/api/v1/auth/login`                  | OAuth2 password flow  |
| POST   | `/api/v1/auth/refresh`                | Rotate access token   |
| GET    | `/api/v1/users/me`                    | Current user          |
| POST   | `/api/v1/rooms`                       | Create room           |
| GET    | `/api/v1/rooms`                       | Joined rooms          |
| GET    | `/api/v1/rooms/nearby`                | Search nearby         |
| GET    | `/api/v1/rooms/{room_id}`             | Room detail           |
| PATCH  | `/api/v1/rooms/{room_id}`             | Update (owner only)   |
| POST   | `/api/v1/rooms/{room_id}/details`     | Add purpose detail    |
| POST   | `/api/v1/rooms/{room_id}/members`     | Join room             |
| GET    | `/api/v1/rooms/{room_id}/members`     | List members          |
| GET    | `/api/v1/rooms/{room_id}/messages`    | Paginated chat        |
| POST   | `/api/v1/rooms/{room_id}/messages`    | Post message          |
