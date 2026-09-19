# HackMIT — Freshman Flu Simulator

Agent-based flu spread simulation over floor plans extracted from images.
See the open PR for the full app.

## SEITR campus simulation (`seitr-sim/`)

Open `seitr-sim/index.html` (e.g. `python3 -m http.server 8080 --directory seitr-sim`). It loads the
MIT campus by default: 32 buildings with sample student sizes and estimated walking distances.

- `seitr-sim/data/` — MIT source files: buildings, walking distance matrices (metres and minutes),
  sample student sizes, campus overview and schematic map.
- `seitr-sim/tools/build_mit_dataset.py` — joins those into `seitr-sim/mit-campus.js` (loaded by the
  page) and `seitr-sim/mit-campus.csv` (same data in the page's CSV import format). Re-run it after
  editing anything in `data/`.

Dorm populations are resident counts; other buildings use a typical concurrent weekday occupancy.
Distances are haversine ×1.25 at 80 m/min, not routed, so they are estimates (±100 m).
