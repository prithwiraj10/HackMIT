"""Small in-memory status store for the local demo call bridge."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class CallState:
    call_sid: str
    status: str = "initiated"
    question: str | None = None
    transcript: list[dict[str, str]] = field(default_factory=list)
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )

    def update(self, status: str, question: str | None = None) -> None:
        self.status = status
        self.question = question
        self.updated_at = datetime.now(timezone.utc).isoformat()


calls: dict[str, CallState] = {}


def snapshot(call_sid: str) -> dict | None:
    call = calls.get(call_sid)
    if not call:
        return None
    return {
        "call_sid": call.call_sid,
        "status": call.status,
        "question": call.question,
        "transcript": call.transcript[-16:],
        "updated_at": call.updated_at,
    }
