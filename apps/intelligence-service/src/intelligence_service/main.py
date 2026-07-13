from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Literal

from fastapi import FastAPI, Response, status
from smart_fasal_contracts import HealthPayload, HealthStatus

SERVICE_NAME: Literal["intelligence-service"] = "intelligence-service"


def _health_payload(health_status: HealthStatus) -> HealthPayload:
    return HealthPayload(service=SERVICE_NAME, status=health_status, timestamp=datetime.now(UTC))


def create_app(readiness: Callable[[], bool] | None = None) -> FastAPI:
    readiness_probe = readiness or (lambda: True)
    application = FastAPI(
        docs_url=None,
        redoc_url=None,
        title="Smart Fasal Intelligence Service",
        version="0.0.0",
    )

    @application.get("/health/live")
    async def health_live(response: Response) -> HealthPayload:
        response.headers["Cache-Control"] = "no-store"
        return _health_payload(HealthStatus.ok)

    @application.get(
        "/health/ready",
        responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": HealthPayload}},
    )
    async def health_ready(response: Response) -> HealthPayload:
        response.headers["Cache-Control"] = "no-store"
        try:
            ready = readiness_probe()
        except Exception:
            ready = False

        if not ready:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return _health_payload(HealthStatus.not_ready)
        return _health_payload(HealthStatus.ok)

    return application


app = create_app()
