"""Agent-based SEIR simulation over an extracted floor-plan layout.

Vectorized with NumPy: every agent is a row in a few flat arrays, and each
time step is a handful of array ops, so 14 sim-days x 500 agents runs in
~1 second.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from .layout import Layout

S, E, I, R = 0, 1, 2, 3
STATE_NAMES = ["S", "E", "I", "R"]


@dataclass
class SimParams:
    n_agents: int = 500
    days: int = 14
    step_minutes: int = 5
    base_transmission: float = 0.002  # per infectious agent per contact-hour at reference density
    incubation_days: float = 2.0
    infectious_days: float = 4.0
    initial_infected: int = 3
    mask_fraction: float = 0.0
    vaccinated_fraction: float = 0.0
    mask_efficacy: float = 0.5
    vaccine_efficacy: float = 0.7
    seed: int = 42
    frame_minutes: int = 60  # playback resolution
    max_render_agents: int = 250


def _room_pools(layout: Layout) -> dict[str, list[int]]:
    pools: dict[str, list[int]] = {}
    for r in layout.rooms:
        pools.setdefault(r.label, []).append(r.id)
    return pools


def _sample_points(layout: Layout, rng: np.random.Generator, per_room: int) -> np.ndarray:
    """(n_rooms, per_room, 2) points inside each room's bbox, nudged to centroid."""
    pts = np.zeros((len(layout.rooms), per_room, 2), dtype=np.float32)
    for r in layout.rooms:
        x0, y0, x1, y1 = r.bbox
        cx, cy = r.centroid
        px = rng.uniform(x0, x1, per_room)
        py = rng.uniform(y0, y1, per_room)
        # Shrink toward centroid so points stay well inside the region.
        px = cx + (px - cx) * 0.72
        py = cy + (py - cy) * 0.72
        pts[r.id, :, 0] = px
        pts[r.id, :, 1] = py
    return pts


def _build_schedules(layout: Layout, p: SimParams, rng: np.random.Generator) -> np.ndarray:
    """(n_agents, 24) room index per hour of day."""
    pools = _room_pools(layout)
    all_ids = [r.id for r in layout.rooms]

    def pool(*names: str) -> list[int]:
        for n in names:
            if pools.get(n):
                return pools[n]
        return all_ids

    dorms = pool("dorm", "other")
    classes = pool("lecture_hall", "other")
    dining = pool("dining", "other")
    gyms = pool("gym", "other")
    corridors = pool("corridor", "other")

    n = p.n_agents
    home = rng.choice(dorms, n)
    class_a = rng.choice(classes, n)
    class_b = rng.choice(classes, n)
    hall = rng.choice(dining, n)
    gym = rng.choice(gyms, n)
    corr = rng.choice(corridors, n)

    sched = np.zeros((n, 24), dtype=np.int32)
    for h in range(24):
        if h < 8 or h >= 22:
            col = home
        elif h == 8:
            col = corr
        elif h in (9, 10, 11):
            col = class_a
        elif h == 12:
            col = hall
        elif h in (13, 14, 15):
            col = class_b
        elif h == 16:
            col = corr
        elif h in (17, 18):
            col = hall
        elif h in (19, 20):
            col = np.where(rng.random(n) < 0.5, gym, home)
        else:
            col = home
        sched[:, h] = col

    # Individual variation: 20% of agents shift their day by +/-1 hour.
    shift = rng.choice([-1, 0, 0, 0, 1], n)
    idx = (np.arange(24)[None, :] + shift[:, None]) % 24
    sched = np.take_along_axis(sched, idx, axis=1)
    return sched


def run_simulation(layout: Layout, p: SimParams) -> dict[str, Any]:
    rng = np.random.default_rng(p.seed)
    n_rooms = len(layout.rooms)
    if n_rooms == 0:
        raise ValueError("layout has no rooms")
    n = p.n_agents

    areas = np.array([r.area for r in layout.rooms], dtype=np.float64)
    density_factor = np.median(areas) / np.maximum(areas, 1.0)
    density_factor = np.clip(density_factor, 0.25, 4.0)

    sched = _build_schedules(layout, p, rng)
    pts = _sample_points(layout, rng, per_room=64)
    slot = rng.integers(0, 64, n)

    state = np.zeros(n, dtype=np.int8)
    susceptibility = np.ones(n, dtype=np.float64)
    masked = rng.random(n) < p.mask_fraction
    vaxed = rng.random(n) < p.vaccinated_fraction
    susceptibility[masked] *= 1.0 - p.mask_efficacy
    susceptibility[vaxed] *= 1.0 - p.vaccine_efficacy

    seed_idx = rng.choice(n, size=min(p.initial_infected, n), replace=False)
    state[seed_idx] = I

    steps_per_day = (24 * 60) // p.step_minutes
    total_steps = steps_per_day * p.days
    dt_hours = p.step_minutes / 60.0

    e_timer = np.zeros(n, dtype=np.float64)
    i_timer = np.zeros(n, dtype=np.float64)
    i_timer[seed_idx] = rng.exponential(p.infectious_days * 24.0, size=len(seed_idx))

    frames_every = max(1, p.frame_minutes // p.step_minutes)
    render_ids = np.sort(rng.choice(n, size=min(p.max_render_agents, n), replace=False))

    frames: list[dict[str, Any]] = []
    curve: list[list[int]] = []

    for step in range(total_steps + 1):
        minute = (step * p.step_minutes) % (24 * 60)
        hour = minute // 60
        room = sched[np.arange(n), hour]

        inf = state == I
        inf_per_room = np.bincount(room[inf], minlength=n_rooms).astype(np.float64)
        sus = state == S
        if inf_per_room.any() and sus.any():
            lam = p.base_transmission * inf_per_room[room] * density_factor[room] * dt_hours
            prob = 1.0 - np.exp(-lam * susceptibility)
            newly = sus & (rng.random(n) < prob)
            state[newly] = E
            e_timer[newly] = rng.gamma(4.0, p.incubation_days * 24.0 / 4.0, size=int(newly.sum()))

        # progression (timers in hours)
        dth = dt_hours
        e_now = state == E
        e_timer[e_now] -= dth
        to_i = e_now & (e_timer <= 0)
        state[to_i] = I
        i_timer[to_i] = rng.gamma(4.0, p.infectious_days * 24.0 / 4.0, size=int(to_i.sum()))
        i_now = state == I
        i_timer[i_now] -= dth
        state[i_now & (i_timer <= 0)] = R

        counts = np.bincount(state, minlength=4).astype(int)
        curve.append([int(step * p.step_minutes), *counts.tolist()])

        if step % frames_every == 0:
            per_room = np.zeros((n_rooms, 4), dtype=np.int32)
            for s in (S, E, I, R):
                m = state == s
                if m.any():
                    per_room[:, s] = np.bincount(room[m], minlength=n_rooms)
            rr = room[render_ids]
            xy = pts[rr, slot[render_ids]]
            jitter = rng.normal(0, 3.0, xy.shape)
            frames.append(
                {
                    "t": int(step * p.step_minutes),
                    "day": int(step // steps_per_day),
                    "hour": int(hour),
                    "room_counts": per_room.tolist(),
                    "agents": np.rint(xy + jitter).astype(int).tolist(),
                    "agent_states": state[render_ids].tolist(),
                }
            )

    totals = np.bincount(state, minlength=4).astype(int).tolist()
    peak = max(c[3] for c in curve)
    return {
        "params": p.__dict__,
        "n_rooms": n_rooms,
        "step_minutes": p.step_minutes,
        "frame_minutes": p.frame_minutes,
        "days": p.days,
        "curve": curve,  # [minute, S, E, I, R]
        "frames": frames,
        "summary": {
            "final": dict(zip(STATE_NAMES, totals)),
            "peak_infectious": int(peak),
            "attack_rate": round((totals[R] + totals[I] + totals[E]) / n, 3),
        },
    }
