"""Generate the sample floor-plan images shipped with the repo."""
from __future__ import annotations

import os

import cv2
import numpy as np

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples")
WALL = 0
FREE = 255
T = 6  # wall thickness
DOOR = 34  # doorway width


def blank(w: int, h: int) -> np.ndarray:
    img = np.full((h, w), FREE, np.uint8)
    cv2.rectangle(img, (0, 0), (w - 1, h - 1), WALL, T)
    return img


def hwall(img, y, x0, x1, doors=()):
    cv2.line(img, (x0, y), (x1, y), WALL, T)
    for dx in doors:
        cv2.line(img, (dx - DOOR // 2, y), (dx + DOOR // 2, y), FREE, T + 2)


def vwall(img, x, y0, y1, doors=()):
    cv2.line(img, (x, y0), (x, y1), WALL, T)
    for dy in doors:
        cv2.line(img, (x, dy - DOOR // 2), (x, dy + DOOR // 2), FREE, T + 2)


def dorm_floor() -> np.ndarray:
    w, h = 1200, 800
    img = blank(w, h)
    # central horizontal corridor between y=360 and y=440
    hwall(img, 360, 0, w, doors=[150, 330, 510, 690, 870, 1050])
    hwall(img, 440, 0, w, doors=[150, 330, 510, 690, 870, 1050])
    # dorm rooms on both sides
    for x in range(240, w - 100, 180):
        vwall(img, x, 0, 360)
        vwall(img, x, 440, h)
    # big lecture hall bottom-left, dining top-left
    vwall(img, 240, 0, 360, doors=[180])
    return img


def campus_floor() -> np.ndarray:
    w, h = 1280, 900
    img = blank(w, h)
    # vertical spine corridor x in [600, 680]
    vwall(img, 600, 0, h, doors=[140, 380, 620, 830])
    vwall(img, 680, 0, h, doors=[140, 380, 620, 830])
    # left wing: two large halls
    hwall(img, 300, 0, 600, doors=[300])
    hwall(img, 600, 0, 600, doors=[300])
    # right wing: dorm block
    hwall(img, 240, 680, w, doors=[980])
    hwall(img, 480, 680, w, doors=[980])
    hwall(img, 720, 680, w, doors=[980])
    vwall(img, 980, 480, 720)
    return img


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    cv2.imwrite(os.path.join(OUT_DIR, "sample_dorm_floor.png"), dorm_floor())
    cv2.imwrite(os.path.join(OUT_DIR, "sample_campus_building.png"), campus_floor())
    print("wrote samples to", OUT_DIR)


if __name__ == "__main__":
    main()
