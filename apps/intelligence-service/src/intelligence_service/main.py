from __future__ import annotations

import json
import os
from collections.abc import Callable
from datetime import UTC, datetime
from hashlib import sha256
from typing import Literal

from fastapi import FastAPI, Response, status
from pydantic import BaseModel, Field
from smart_fasal_contracts import HealthPayload, HealthStatus

SERVICE_NAME: Literal["intelligence-service"] = "intelligence-service"


class EarthJobExecuteRequest(BaseModel):
    jobId: str
    plotId: str
    geometryVersion: int
    dataset: Literal["CHIRPS", "SENTINEL_2", "SENTINEL_1", "ERA5_LAND", "ELEVATION", "LAND_COVER"]
    windowStart: datetime
    windowEnd: datetime
    reducer: str
    scaleMetres: int = Field(gt=0, le=10_000)
    mode: Literal["LIVE", "RECORDED", "SIMULATED"]


class EarthJobExecuteResponse(BaseModel):
    jobId: str
    state: Literal["PROPOSED", "UNAVAILABLE", "RETRYABLE_FAILURE"]
    snapshotChecksum: str | None = None
    evidence: list[dict[str, object]]
    limitations: list[str]
    generatedAt: datetime


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

    @application.post("/internal/v1/intelligence/earth-jobs/{job_id}:execute")
    async def execute_earth_job(
        job_id: str, request: EarthJobExecuteRequest
    ) -> EarthJobExecuteResponse:
        generated_at = datetime.now(UTC)
        if job_id != request.jobId:
            return EarthJobExecuteResponse(
                jobId=job_id,
                state="RETRYABLE_FAILURE",
                evidence=[],
                limitations=["Path job id and body job id did not match."],
                generatedAt=generated_at,
            )
        if request.mode == "LIVE" and not os.environ.get("GOOGLE_EARTH_ENGINE_PROJECT"):
            return EarthJobExecuteResponse(
                jobId=request.jobId,
                state="UNAVAILABLE",
                evidence=[],
                limitations=["Google Earth Engine credentials are not configured."],
                generatedAt=generated_at,
            )
        payload = {
            "dataset": request.dataset,
            "geometryVersion": request.geometryVersion,
            "plotId": request.plotId,
            "reducer": request.reducer,
            "scaleMetres": request.scaleMetres,
            "windowEnd": request.windowEnd.isoformat(),
            "windowStart": request.windowStart.isoformat(),
        }
        checksum = "sha256:" + sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        return EarthJobExecuteResponse(
            jobId=request.jobId,
            state="PROPOSED",
            snapshotChecksum=checksum,
            evidence=[
                {
                    "evidenceId": "00000000-0000-4000-8000-000000000604",
                    "plotId": request.plotId,
                    "kind": "EARTH_OBSERVATION",
                    "metricKey": f"{request.dataset.lower()}_fixture_index",
                    "value": {
                        "state": "KNOWN",
                        "originalValue": "0.61",
                        "originalUnit": "INDEX",
                        "normalizedValue": "0.61",
                        "normalizedUnit": "INDEX",
                    },
                    "observedAt": request.windowEnd.isoformat(),
                    "receivedAt": generated_at.isoformat(),
                    "source": {
                        "sourceId": "raigad-demo-earth",
                        "sourceName": "Raigad demo Earth fixture",
                        "provenanceType": "SATELLITE",
                        "rightsLabel": "Synthetic demo data",
                        "sourceVersion": "fixture-v1",
                    },
                    "dataMode": request.mode,
                    "quality": "USE_WITH_CAUTION",
                    "freshness": "CURRENT",
                    "decisionEligible": False,
                    "limitations": ["Fixture-backed Earth observation proposal; worker persists."],
                    "policyVersion": "evidence-m4-v1",
                    "conversionVersion": "unit-conversion-m4-v1",
                }
            ],
            limitations=["Farmer requests never wait synchronously for Earth processing."],
            generatedAt=generated_at,
        )

    return application


app = create_app()
