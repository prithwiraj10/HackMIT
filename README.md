# HackMIT — Freshman Flu Simulator

Agent-based flu spread simulation over floor plans extracted from images.
See the open PR for the full app.

## Campus frontend

The MIT campus UI is in [`frontend/`](frontend/). It runs independently of the open PR and leaves the original [`seitr-sim/`](seitr-sim/) prototype unchanged.

```sh
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:3000. No API keys are required.

The current UI uses the repository's deterministic SEITR model and synthetic building populations. It includes a campus map, 21-day playback, building details, scenario parameters, and baseline comparisons. It does not yet implement individual agents or sponsor integrations.

See [`frontend/README.md`](frontend/README.md) for architecture, verification, data attribution, and integration boundaries.
