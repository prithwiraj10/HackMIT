"""Floor-plan image -> room/corridor graph extraction with OpenCV.

Pipeline: binarize -> free-space mask -> erode away doorways -> connected
components as room seeds -> watershed back over the full free space ->
polygons + adjacency graph. Falls back to a grid partition of the free space
when segmentation looks degenerate, so downstream simulation always runs.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

import cv2
import numpy as np

ROOM_LABELS = ["dorm", "lecture_hall", "dining", "gym", "corridor", "other"]
MIN_ROOM_AREA_FRAC = 0.0025  # of image area


@dataclass
class Room:
    id: int
    label: str
    centroid: list[float]
    area: float
    bbox: list[int]
    polygon: list[list[int]]
    corridor_score: float = 0.0


@dataclass
class Layout:
    image_name: str
    width: int
    height: int
    rooms: list[Room] = field(default_factory=list)
    edges: list[list[int]] = field(default_factory=list)
    method: str = "watershed"

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        return d


def _free_space_mask(gray: np.ndarray) -> np.ndarray:
    """White (255) = walkable free space, black = wall."""
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # Ensure free space is the majority class and is white.
    if (binary == 255).mean() < 0.5:
        binary = cv2.bitwise_not(binary)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return binary


def _polygon_of(mask: np.ndarray) -> list[list[int]]:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []
    cnt = max(contours, key=cv2.contourArea)
    eps = 0.004 * cv2.arcLength(cnt, True)
    approx = cv2.approxPolyDP(cnt, eps, True)
    return [[int(p[0][0]), int(p[0][1])] for p in approx]


def _corridor_score(mask: np.ndarray, area: float) -> float:
    """0 = blobby room, 1 = thin corridor-like region."""
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    half_width = float(dist.max()) or 1.0
    # A square room of this area would have half-width sqrt(area)/2.
    ideal = np.sqrt(area) / 2.0
    return float(np.clip(1.0 - half_width / max(ideal, 1e-6), 0.0, 1.0))


def _guess_labels(rooms: list[Room]) -> None:
    if not rooms:
        return
    areas = np.array([r.area for r in rooms], dtype=float)
    order = np.argsort(-areas)
    non_corridor = [i for i in order if rooms[i].corridor_score < 0.55]
    assigned = 0
    for i in order:
        r = rooms[i]
        if r.corridor_score >= 0.55:
            r.label = "corridor"
            continue
        rank = non_corridor.index(i)
        n = len(non_corridor)
        if rank < max(1, int(0.15 * n)):
            r.label = "lecture_hall"
        elif rank < max(2, int(0.25 * n)):
            r.label = "dining"
        elif rank < max(3, int(0.32 * n)):
            r.label = "gym"
        else:
            r.label = "dorm"
        assigned += 1


def _adjacency(labels: np.ndarray, n: int) -> list[list[int]]:
    edges: set[tuple[int, int]] = set()
    kernel = np.ones((3, 3), np.uint8)
    for i in range(1, n + 1):
        m = (labels == i).astype(np.uint8)
        if not m.any():
            continue
        grown = cv2.dilate(m, kernel, iterations=6)
        touching = np.unique(labels[grown > 0])
        for j in touching:
            j = int(j)
            if j > 0 and j != i:
                edges.add((min(i, j), max(i, j)))
    return [[a - 1, b - 1] for a, b in sorted(edges)]


def _grid_fallback(free: np.ndarray, cols: int = 6, rows: int = 4) -> np.ndarray:
    h, w = free.shape
    labels = np.zeros((h, w), np.int32)
    idx = 1
    for r in range(rows):
        for c in range(cols):
            y0, y1 = r * h // rows, (r + 1) * h // rows
            x0, x1 = c * w // cols, (c + 1) * w // cols
            cell = np.zeros_like(labels, dtype=bool)
            cell[y0:y1, x0:x1] = True
            m = cell & (free > 0)
            if m.sum() < 0.1 * (y1 - y0) * (x1 - x0):
                continue
            labels[m] = idx
            idx += 1
    return labels


def _rooms_from_labels(labels: np.ndarray, n: int, min_area: float) -> tuple[list[Room], np.ndarray]:
    rooms: list[Room] = []
    remap = np.zeros(n + 1, np.int32)
    for i in range(1, n + 1):
        mask = (labels == i).astype(np.uint8)
        area = float(mask.sum())
        if area < min_area:
            labels[labels == i] = 0
            continue
        mask *= 255
        ys, xs = np.nonzero(mask)
        cx, cy = float(xs.mean()), float(ys.mean())
        poly = _polygon_of(mask)
        if len(poly) < 3:
            labels[labels == i] = 0
            continue
        rid = len(rooms)
        remap[i] = rid + 1
        rooms.append(
            Room(
                id=rid,
                label="other",
                centroid=[round(cx, 1), round(cy, 1)],
                area=area,
                bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                polygon=poly,
                corridor_score=round(_corridor_score(mask, area), 3),
            )
        )
    return rooms, remap[labels]


def extract_layout(image_path: str, image_name: str | None = None) -> Layout:
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"could not read image: {image_path}")
    scale = 1400.0 / max(img.shape)
    if scale < 1.0:
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    h, w = img.shape
    free = _free_space_mask(img)
    min_area = MIN_ROOM_AREA_FRAC * h * w

    # Erode enough to snap doorways shut, leaving one seed per enclosed region.
    # Doorway width is unknown, so sweep erosion radii and keep the one that
    # yields the most seeds of plausible room size.
    best: tuple[int, np.ndarray] = (0, np.zeros_like(free, np.int32))
    for frac in (0.008, 0.015, 0.025, 0.035, 0.05, 0.07):
        e = max(3, int(frac * min(h, w)))
        eroded = cv2.erode(free, np.ones((e, e), np.uint8))
        n_c, lab = cv2.connectedComponents(eroded)
        counts = np.bincount(lab.ravel(), minlength=n_c)
        good = int((counts[1:] >= 0.25 * min_area).sum())
        if good > best[0]:
            best = (good, lab)
    seeds_mask = (best[1] > 0).astype(np.uint8) * 255
    seed_labels = best[1]
    n_seeds = int(seed_labels.max()) + 1
    method = "watershed"

    if n_seeds - 1 < 2:
        seed_labels = _grid_fallback(free)
        n = int(seed_labels.max())
        method = "grid_fallback"
        labels = seed_labels
    else:
        markers = seed_labels.copy()
        markers[free == 0] = 0
        color = cv2.cvtColor(free, cv2.COLOR_GRAY2BGR)
        unknown = (free > 0) & (seeds_mask == 0)
        markers[unknown] = 0
        markers = markers + 1  # watershed: 1 = background-ish, 0 = unknown
        markers[unknown] = 0
        markers = cv2.watershed(color, markers.astype(np.int32))
        labels = np.where(markers > 1, markers - 1, 0).astype(np.int32)
        labels[free == 0] = 0
        n = int(labels.max())

    rooms, labels = _rooms_from_labels(labels, n, min_area)
    if len(rooms) < 2:
        labels = _grid_fallback(free)
        rooms, labels = _rooms_from_labels(labels, int(labels.max()), min_area)
        method = "grid_fallback"

    _guess_labels(rooms)
    edges = _adjacency(labels, len(rooms))
    return Layout(
        image_name=image_name or "floorplan",
        width=w,
        height=h,
        rooms=rooms,
        edges=edges,
        method=method,
    )
