# HackMIT — Flu U Simulator

Agent-based flu spread simulation over floor plans extracted from images.
See the open PR for the full app.

## Campus frontend

The MIT campus UI is in [`frontend/`](frontend/). It runs independently of the open PR and leaves the original [`seitr-sim/`](seitr-sim/) prototype unchanged.

```sh
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:3000. No API keys are required for the simulation.

The "Ask the model" chat panel on `/simulation` answers questions with OpenAI
function calling over real simulation runs; it needs `OPENAI_API_KEY` in
`frontend/.env.local` (see `frontend/.env.example` and `frontend/README.md`).

The current UI uses the repository's deterministic SEITR model and synthetic building populations. It includes a campus map, 21-day playback, building details, scenario parameters, and baseline comparisons. It does not yet implement individual agents or sponsor integrations.

See [`frontend/README.md`](frontend/README.md) for architecture, verification, data attribution, and integration boundaries.

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
The generator also writes `frontend/src/data/mit-campus.json`, the dataset the frontend consumes.
