"""FastAPI app: floor-plan upload, layout extraction/editing, flu simulation."""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import storage
from .layout import ROOM_LABELS, Layout, Room, extract_layout
from .simulation import SimParams, run_simulation

app = FastAPI(title="Freshman Flu Simulator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class LabelUpdate(BaseModel):
    labels: dict[int, str]


class SimRequest(BaseModel):
    n_agents: int = Field(500, ge=10, le=5000)
    days: int = Field(14, ge=1, le=60)
    step_minutes: int = Field(5, ge=1, le=60)
    base_transmission: float = Field(0.002, ge=0.0, le=1.0)
    incubation_days: float = Field(2.0, gt=0, le=14)
    infectious_days: float = Field(4.0, gt=0, le=21)
    initial_infected: int = Field(3, ge=1, le=500)
    mask_fraction: float = Field(0.0, ge=0.0, le=1.0)
    vaccinated_fraction: float = Field(0.0, ge=0.0, le=1.0)
    seed: int = 42


def _load_layout(plan_id: str) -> Layout:
    raw = storage.read_json(plan_id, "layout.json")
    if raw is None:
        raise HTTPException(404, f"unknown plan {plan_id}")
    rooms = [Room(**r) for r in raw["rooms"]]
    return Layout(
        image_name=raw["image_name"],
        width=raw["width"],
        height=raw["height"],
        rooms=rooms,
        edges=[list(e) for e in raw["edges"]],
        method=raw["method"],
    )


def _ingest(plan_id: str, path: str, name: str) -> dict[str, Any]:
    layout = extract_layout(path, name)
    payload = layout.to_dict()
    payload["plan_id"] = plan_id
    storage.write_json(plan_id, "layout.json", payload)
    return payload


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/labels")
def labels() -> dict[str, list[str]]:
    return {"labels": ROOM_LABELS}


@app.get("/api/samples")
def samples() -> dict[str, list[str]]:
    return {"samples": storage.list_samples()}


@app.post("/api/plans/upload")
async def upload(file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read()
    if not content:
        raise HTTPException(400, "empty upload")
    plan_id = uuid.uuid4().hex[:12]
    path = storage.save_image(plan_id, file.filename or "image.png", content)
    try:
        return _ingest(plan_id, path, file.filename or "upload")
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/plans/sample/{sample_name}")
def use_sample(sample_name: str) -> dict[str, Any]:
    plan_id = uuid.uuid4().hex[:12]
    try:
        path = storage.copy_sample(plan_id, sample_name)
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown sample {sample_name}") from exc
    return _ingest(plan_id, path, sample_name)


@app.get("/api/plans/{plan_id}/layout")
def get_layout(plan_id: str) -> dict[str, Any]:
    raw = storage.read_json(plan_id, "layout.json")
    if raw is None:
        raise HTTPException(404, f"unknown plan {plan_id}")
    return raw


@app.get("/api/plans/{plan_id}/image")
def get_image(plan_id: str) -> FileResponse:
    try:
        return FileResponse(storage.image_path(plan_id))
    except FileNotFoundError as exc:
        raise HTTPException(404, f"unknown plan {plan_id}") from exc


@app.put("/api/plans/{plan_id}/labels")
def update_labels(plan_id: str, body: LabelUpdate) -> dict[str, Any]:
    raw = storage.read_json(plan_id, "layout.json")
    if raw is None:
        raise HTTPException(404, f"unknown plan {plan_id}")
    for room_id, label in body.labels.items():
        if label not in ROOM_LABELS:
            raise HTTPException(400, f"invalid label {label}")
        if not 0 <= int(room_id) < len(raw["rooms"]):
            raise HTTPException(400, f"invalid room id {room_id}")
        raw["rooms"][int(room_id)]["label"] = label
    storage.write_json(plan_id, "layout.json", raw)
    return raw


@app.post("/api/plans/{plan_id}/simulate")
def simulate(plan_id: str, req: SimRequest) -> dict[str, Any]:
    layout = _load_layout(plan_id)
    params = SimParams(**req.model_dump())
    result = run_simulation(layout, params)
    result["plan_id"] = plan_id
    storage.write_json(plan_id, "result.json", result)
    return result


@app.get("/api/plans/{plan_id}/result")
def get_result(plan_id: str) -> dict[str, Any]:
    raw = storage.read_json(plan_id, "result.json")
    if raw is None:
        raise HTTPException(404, "no simulation result for this plan yet")
    return raw
