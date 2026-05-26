from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import limiter
from app.db.session import engine
from app.realtime.broker import close_broker, init_broker
from app.routes.v1.router import api_router
from app.routes.v1.ws import init_manager, shutdown_manager
from app.schemas.common import ErrorResponse, HealthResponse

configure_logging()
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await init_broker()
    init_manager()
    log.info("startup", env=settings.app_env, db=settings.database_url, redis=settings.redis_url)
    try:
        yield
    finally:
        await shutdown_manager()
        await close_broker()
        await engine.dispose()
        log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        debug=settings.app_debug,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    )

    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_origin_regex=settings.cors_allow_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                code=exc.code, message=exc.message, details=exc.details
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        safe_errors = [{k: v for k, v in err.items() if k != "ctx"} for err in exc.errors()]
        return JSONResponse(
            status_code=422,
            content=jsonable_encoder(
                ErrorResponse(
                    code="validation_error",
                    message="Request validation failed",
                    details={"errors": safe_errors},
                )
            ),
        )

    @app.exception_handler(RateLimitExceeded)
    async def _handle_rate_limit(_: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            content=ErrorResponse(
                code="rate_limited",
                message="Too many requests",
                details={"limit": str(exc.detail)},
            ).model_dump(),
        )

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    async def health() -> HealthResponse:
        return HealthResponse(app=settings.app_name, version="0.1.0")

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
