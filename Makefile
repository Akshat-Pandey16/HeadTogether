.PHONY: help \
        install install-api install-web \
        dev dev-api dev-web dev-web-https dev-scheduler dev-all \
        build build-web \
        lint lint-api lint-web \
        format format-api format-web \
        check check-api typecheck-web \
        test \
        migrate revision reset-db \
        redis-up redis-down \
        clean clean-api clean-web clean-all

API_DIR := apps/api
WEB_DIR := apps/web

help:
	@echo "HeadTogether monorepo"
	@echo ""
	@echo "Install:"
	@echo "  make install              install backend + frontend deps"
	@echo "  make install-api          install backend deps only (uv)"
	@echo "  make install-web          install frontend deps only (npm)"
	@echo ""
	@echo "Develop:"
	@echo "  make dev                  run backend + scheduler + frontend together"
	@echo "  make dev-api              run the FastAPI server (port 8000)"
	@echo "  make dev-scheduler        run the APScheduler process"
	@echo "  make dev-web              run the Vite dev server (port 5173)"
	@echo "  make dev-web-https        run the Vite dev server with self-signed HTTPS"
	@echo ""
	@echo "Build:"
	@echo "  make build                production build (web)"
	@echo ""
	@echo "Quality:"
	@echo "  make lint                 lint both apps"
	@echo "  make format               auto-format both apps"
	@echo "  make check                full ruff + ty + tsc check"
	@echo "  make typecheck-web        tsc -b --noEmit"
	@echo ""
	@echo "Database:"
	@echo "  make migrate              apply alembic migrations"
	@echo "  make revision m=\"msg\"     create a new migration"
	@echo "  make reset-db             drop sqlite db and re-migrate"
	@echo ""
	@echo "Infra:"
	@echo "  make redis-up             start redis via docker-compose"
	@echo "  make redis-down           stop redis"
	@echo ""
	@echo "Clean:"
	@echo "  make clean                remove caches in both apps"
	@echo "  make clean-all            also remove node_modules and .venv"

# -------- Install --------

install: install-api install-web

install-api:
	$(MAKE) -C $(API_DIR) install

install-web:
	bun install

# -------- Develop --------

dev: dev-all

dev-all:
	@echo "Starting api, scheduler, and web concurrently. Ctrl+C to stop."
	@(trap 'kill 0' INT TERM; \
	  $(MAKE) -s dev-api & \
	  $(MAKE) -s dev-scheduler & \
	  $(MAKE) -s dev-web & \
	  wait)

dev-api:
	$(MAKE) -C $(API_DIR) dev

dev-scheduler:
	$(MAKE) -C $(API_DIR) scheduler

dev-web:
	bun --filter @headtogether/web dev

dev-web-https:
	VITE_HTTPS=true bun --filter @headtogether/web dev

# -------- Build --------

build: build-web

build-web:
	bun --filter @headtogether/web build

# -------- Quality --------

lint: lint-api lint-web

lint-api:
	$(MAKE) -C $(API_DIR) lint

lint-web:
	bun --filter @headtogether/web lint

format: format-api format-web

format-api:
	$(MAKE) -C $(API_DIR) format

format-web:
	bun --filter @headtogether/web format

check: check-api typecheck-web

check-api:
	$(MAKE) -C $(API_DIR) check

typecheck-web:
	bun --filter @headtogether/web typecheck

# -------- Database --------

migrate:
	$(MAKE) -C $(API_DIR) migrate

revision:
	@test -n "$(m)" || (echo "Usage: make revision m=\"message\"" && exit 1)
	$(MAKE) -C $(API_DIR) revision m="$(m)"

reset-db:
	$(MAKE) -C $(API_DIR) reset-db

# -------- Infra --------

redis-up:
	$(MAKE) -C $(API_DIR) redis-up

redis-down:
	$(MAKE) -C $(API_DIR) redis-down

# -------- Clean --------

clean: clean-api clean-web

clean-api:
	$(MAKE) -C $(API_DIR) clean

clean-web:
	rm -rf $(WEB_DIR)/dist $(WEB_DIR)/.vite

clean-all: clean
	rm -rf $(WEB_DIR)/node_modules node_modules $(API_DIR)/.venv
