"""Flat-file storage for uploaded floor plans, layouts and simulation results."""
from __future__ import annotations

import json
import os
import shutil
from typing import Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get("FLU_DATA_DIR", os.path.join(BASE_DIR, "data"))
SAMPLES_DIR = os.path.join(BASE_DIR, "samples")


def plan_dir(plan_id: str) -> str:
    d = os.path.join(DATA_DIR, plan_id)
    os.makedirs(d, exist_ok=True)
    return d


def image_path(plan_id: str) -> str:
    d = plan_dir(plan_id)
    for f in sorted(os.listdir(d)):
        if f.startswith("image."):
            return os.path.join(d, f)
    raise FileNotFoundError(f"no image for plan {plan_id}")


def save_image(plan_id: str, filename: str, content: bytes) -> str:
    ext = os.path.splitext(filename)[1].lower() or ".png"
    path = os.path.join(plan_dir(plan_id), f"image{ext}")
    with open(path, "wb") as f:
        f.write(content)
    return path


def copy_sample(plan_id: str, sample_name: str) -> str:
    src = os.path.join(SAMPLES_DIR, sample_name)
    if not os.path.isfile(src):
        raise FileNotFoundError(sample_name)
    dst = os.path.join(plan_dir(plan_id), "image" + os.path.splitext(sample_name)[1])
    shutil.copyfile(src, dst)
    return dst


def write_json(plan_id: str, name: str, payload: Any) -> None:
    with open(os.path.join(plan_dir(plan_id), name), "w") as f:
        json.dump(payload, f)


def read_json(plan_id: str, name: str) -> Any:
    path = os.path.join(plan_dir(plan_id), name)
    if not os.path.isfile(path):
        return None
    with open(path) as f:
        return json.load(f)


def list_samples() -> list[str]:
    if not os.path.isdir(SAMPLES_DIR):
        return []
    return sorted(f for f in os.listdir(SAMPLES_DIR) if f.lower().endswith((".png", ".jpg", ".jpeg")))


def list_plans() -> list[str]:
    if not os.path.isdir(DATA_DIR):
        return []
    return sorted(d for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d)))
