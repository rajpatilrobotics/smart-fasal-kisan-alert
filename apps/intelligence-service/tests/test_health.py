from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from smart_fasal_contracts import CONTRACT_VERSION, HealthPayload

from intelligence_service.__main__ import _port_from_environment, main
from intelligence_service.main import SERVICE_NAME, create_app


def test_generated_contract_is_available_to_python() -> None:
    assert CONTRACT_VERSION == "1.0.0-m1"
    with pytest.raises(ValidationError):
        HealthPayload.model_validate(
            {
                "extra": "not allowed by the canonical schema",
                "service": SERVICE_NAME,
                "status": "ok",
                "timestamp": "2026-07-13T00:00:00Z",
            }
        )


def test_liveness_and_readiness_contract() -> None:
    with TestClient(create_app()) as client:
        for path in ("/health/live", "/health/ready"):
            response = client.get(path)
            payload = response.json()

            assert response.status_code == 200
            assert payload["service"] == SERVICE_NAME
            assert payload["status"] == "ok"
            assert response.headers["cache-control"] == "no-store"
            datetime.fromisoformat(payload["timestamp"].replace("Z", "+00:00"))


def test_readiness_fails_closed_without_failing_liveness() -> None:
    with TestClient(create_app(readiness=lambda: False)) as client:
        live = client.get("/health/live")
        ready = client.get("/health/ready")

        assert live.headers["cache-control"] == "no-store"
        assert ready.headers["cache-control"] == "no-store"
        assert live.status_code == 200
        assert live.json()["status"] == "ok"
        assert ready.status_code == 503
        assert ready.json()["status"] == "not_ready"


def test_readiness_hides_probe_failures() -> None:
    def failed_probe() -> bool:
        raise RuntimeError("sensitive dependency detail")

    with TestClient(create_app(readiness=failed_probe)) as client:
        response = client.get("/health/ready")

        assert response.status_code == 503
        assert response.json().keys() == {"service", "status", "timestamp"}
        assert "sensitive dependency detail" not in response.text


def test_runtime_port_validation(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PORT", "8088")
    assert _port_from_environment() == 8088

    for invalid_port in ("invalid", "0", "65536"):
        monkeypatch.setenv("PORT", invalid_port)
        with pytest.raises(ValueError):
            _port_from_environment()


def test_runtime_main_uses_explicit_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    call: dict[str, object] = {}

    def capture_run(application: str, *, host: str, port: int) -> None:
        call.update(application=application, host=host, port=port)

    monkeypatch.setenv("HOST", "127.0.0.1")
    monkeypatch.setenv("PORT", "18088")
    monkeypatch.setattr("intelligence_service.__main__.uvicorn.run", capture_run)

    main()
    assert call == {
        "application": "intelligence_service.main:app",
        "host": "127.0.0.1",
        "port": 18088,
    }
