#!/usr/bin/env python3
"""Snap campus_buildings.csv coordinates to OpenStreetMap building footprints
and rebuild the estimated walking-distance files from the corrected positions.

Buildings are matched to footprints in frontend/src/data/campus-map.json by MIT
building number (the OSM `ref` tag). Rows without a footprint (open spaces and
off-campus areas) keep their existing coordinates.

Distances reproduce the original method noted in distances_long.csv:
haversine straight-line metres x1.25, walked at 80 m/min.

Run:  python3 seitr-sim/tools/snap_coordinates.py
      python3 seitr-sim/tools/build_mit_dataset.py
"""

import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MAP = ROOT.parent / "frontend" / "src" / "data" / "campus-map.json"

WALK_FACTOR = 1.25
WALK_SPEED_M_PER_MIN = 80
METHOD = "haversine_x1.25_at_80m_per_min"
# Rows whose OSM footprint sits under a different building number.
REF_OVERRIDES = {"media_lab": "E14"}


def read_csv(path):
    with path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        return list(reader), reader.fieldnames


def write_csv(path, fieldnames, rows):
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def centroid(ring):
    if ring[0] != ring[-1]:
        ring = ring + [ring[0]]
    area = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        cross = x0 * y1 - x1 * y0
        area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if abs(area) < 1e-15:
        return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)
    area *= 0.5
    return cx / (6 * area), cy / (6 * area)


def haversine_m(a, b):
    r = 6371000.0
    p = math.pi / 180
    la1, lo1 = float(a["lat"]) * p, float(a["lon"]) * p
    la2, lo2 = float(b["lat"]) * p, float(b["lon"]) * p
    x = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(x))


def main():
    buildings, fields = read_csv(DATA / "campus_buildings.csv")
    footprints = {
        f["properties"]["ref"]: f["geometry"]["coordinates"]
        for f in json.loads(MAP.read_text(encoding="utf-8"))["features"]
        if f["properties"].get("kind") == "building" and f["properties"].get("ref")
    }

    snapped = 0
    for row in buildings:
        ref = REF_OVERRIDES.get(row["id"], row["mit_number"])
        ring = footprints.get(ref)
        if not ring:
            continue
        lon, lat = centroid(ring)
        moved = haversine_m(row, {"lat": lat, "lon": lon})
        row["lat"] = f"{lat:.5f}"
        row["lon"] = f"{lon:.5f}"
        row["coords_status"] = "osm_footprint_centroid"
        snapped += 1
        print(f"{row['id']:16} {ref:6} moved {moved:5.0f} m")
    write_csv(DATA / "campus_buildings.csv", fields, buildings)

    ids = [b["id"] for b in buildings]
    metres = {a["id"]: {b["id"]: round(haversine_m(a, b) * WALK_FACTOR) for b in buildings} for a in buildings}
    minutes = {a: {b: round(metres[a][b] / WALK_SPEED_M_PER_MIN, 1) for b in ids} for a in ids}

    write_csv(DATA / "distance_matrix_walk_m.csv", ["id"] + ids,
              [{"id": a, **{b: metres[a][b] for b in ids}} for a in ids])
    write_csv(DATA / "distance_matrix_walk_min.csv", ["id"] + ids,
              [{"id": a, **{b: minutes[a][b] for b in ids}} for a in ids])
    long_rows = []
    for a in buildings:
        for b in buildings:
            if a["id"] == b["id"]:
                continue
            straight = haversine_m(a, b)
            long_rows.append({
                "from_id": a["id"],
                "to_id": b["id"],
                "straight_line_m": round(straight),
                "walk_m_est": round(straight * WALK_FACTOR),
                "walk_min_est": round(straight * WALK_FACTOR / WALK_SPEED_M_PER_MIN, 1),
                "method": METHOD,
            })
    write_csv(DATA / "distances_long.csv",
              ["from_id", "to_id", "straight_line_m", "walk_m_est", "walk_min_est", "method"], long_rows)

    print(f"snapped {snapped}/{len(buildings)} buildings; rebuilt distance files for {len(ids)} locations")


if __name__ == "__main__":
    main()
