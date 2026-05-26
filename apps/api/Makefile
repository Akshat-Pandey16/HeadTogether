.PHONY: install dev run lint format check migrate revision reset-db clean

install:
	uv sync --all-groups

dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run:
	uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

lint:
	uv run ruff check .

format:
	uv run ruff format .
	uv run ruff check --fix .

check:
	uv run ruff check .
	uv run ruff format --check .
	uv run ty check app

migrate:
	uv run alembic upgrade head

revision:
	@test -n "$(m)" || (echo "Usage: make revision m=\"message\"" && exit 1)
	uv run alembic revision --autogenerate -m "$(m)"

reset-db:
	rm -f headtogether.db
	uv run alembic upgrade head

clean:
	rm -rf .ruff_cache .ty_cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
