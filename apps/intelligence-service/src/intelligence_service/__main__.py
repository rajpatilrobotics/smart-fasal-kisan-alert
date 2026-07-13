from __future__ import annotations

import os

import uvicorn


def _port_from_environment() -> int:
    raw_port = os.environ.get("PORT", "8088")
    try:
        port = int(raw_port)
    except ValueError as error:
        raise ValueError("PORT must be an integer") from error

    if not 1 <= port <= 65535:
        raise ValueError("PORT must be between 1 and 65535")
    return port


def main() -> None:
    uvicorn.run(
        "intelligence_service.main:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=_port_from_environment(),
    )


if __name__ == "__main__":
    main()
