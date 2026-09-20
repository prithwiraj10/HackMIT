# Flu U campus frontend

A simulator for exploring modeled illness exposure across 32 MIT locations over 21 days. The map uses public geography. The building cohorts are sample student sizes and the outcomes are simulated, not observations or predictions of conditions at MIT.

## Run locally

Requires Node.js 20.9 or later. Developed and checked with Node.js 24.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The landing page leads to the simulation via the student button (`/students`) and the student-support workspace via the admin button (`/admin`). No account or backend is needed for the simulation itself; without a Google Maps key, the bundled offline campus map is used automatically. Scenario state is held in memory and resets when the page reloads. Export a run to keep its parameters and results.

### Chat assistant

The "Ask the model" panel on the simulation answers natural-language questions using OpenAI function calling against real simulation runs. It needs a key:

```sh
cp .env.example .env.local   # then set OPENAI_API_KEY
```

`OPENAI_MODEL` defaults to `gpt-4o-mini`. The key stays server-side: the browser only ever calls `POST /api/chat`.

### Enable the 3D satellite campus

1. In Google Cloud, attach billing to the project and enable **Maps JavaScript API**.
2. Create a browser API key. Restrict it to **HTTP referrers** (`http://localhost:3000/*` while developing, plus the production domain later) and restrict its API access to **Maps JavaScript API**.
3. Copy `.env.example` to `.env.local` and add the key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_restricted_browser_key
NEXT_PUBLIC_GOOGLE_MAP_ID=your_optional_3d_map_id
```

Restart `npm run dev` after changing environment variables. The Google key is expected to be visible in browser requests, so referrer and API restrictions are required. `.env.local` is ignored by Git and must never be committed.

When configured, the map opens on a satellite globe, flies into MIT, renders all 32 model locations as risk-colored 3D markers, moves to a selected building, and falls back to the bundled map if Google fails to initialize.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

Development and build scripts use Next.js's supported Webpack option because Turbopack could not launch its build workers in the current host environment.

## What is implemented

- Optional Google photorealistic 3D satellite campus with an Earth-to-MIT camera flight and risk-colored 3D building markers. The bundled map with real building footprints, street geometry, and the Charles River remains the no-key and error fallback.
- Timeline with days 0 through 21, playback, pause, reset, and speed selection. All displayed metrics, colors, and explanations follow the selected day.
- Building details with the next-day exposure probability, modeled population compartments, and a calculation-based explanation.
- Scenario lab with seven parameters from the existing model, presets, validation, and a preserved baseline.
- Comparison curves, cumulative exposures, peak infectious population within the selected window, and building-level differences.
- JSON export, data-source dialog, and model limitations page.
- Chat assistant (`/api/chat` + `src/lib/chat-tools.ts`): `get_hotspots`, `get_room_parameters`, `get_transmission_breakdown`, `simulate_intervention`, and `simulate_intervention_timing`. Each answer shows the tool calls that produced it.
- Responsive layouts, labeled form controls, visible keyboard focus, and reduced-motion support.

Route planning, live alerts, student tracking, The Token Company, and Voloridge are intentionally excluded.

## Technology choices and Safara reference

Safara's [public dependency manifest](https://github.com/AdhyyanKumar/safara/blob/main/package.json) lists Next.js, React, TypeScript, Tailwind CSS, Google Maps React bindings, Three.js, React Three Fiber, and H3. Its repository was used to understand the stack and map-led component structure. No Safara source code or branding was copied.

This implementation uses Next.js 16, React 19, TypeScript, Tailwind 4 with custom CSS, Lucide icons, D3 geographic projection for the offline map, and Google's official JavaScript API loader for the optional 3D satellite map. There is no routing requirement or hex-grid calculation in this version, so those extra libraries are not included.

## Source layout

```text
src/app/                       Entry page, layout, design tokens, responsive CSS
src/components/dashboard.tsx   Navigation, playback, scenarios, comparison, dialogs
src/components/campus-map.tsx  Google 3D map, camera flight, markers, offline fallback
src/components/trend-chart.tsx Comparison and timeline visualization
src/components/location-detail.tsx
src/components/chat-panel.tsx  "Ask the model" chat UI on the simulation page
src/app/api/chat/route.ts      OpenAI function-calling loop (server-side key)
src/lib/chat-tools.ts          Simulation-backed tools the assistant can call
src/lib/simulation.ts          Typed adapter for the existing SEITR equations
src/data/mit-campus.json       MIT buildings, sample sizes, walk distances
                               (generated by ../seitr-sim/tools/build_mit_dataset.py)
src/data/sample-buildings.json Earlier synthetic sample, kept for reference
src/data/campus-map.json       Derived public geographic dataset
tests/simulation.test.ts      Numerical correctness and parity checks
scripts/prepare_map.py         Rebuild geometry from public OSM XML exports
```

## Model and tests

The model input is `src/data/mit-campus.json`: 32 MIT buildings totalling 8,515 sample students, with the walking-distance matrix from `../seitr-sim/data`. Dorm sizes are approximate bed counts and other buildings use a typical concurrent weekday occupancy; distances are haversine × 1.25 at 80 m/min, not routed. Regenerate both the standalone simulator dataset and this file with:

```sh
python3 ../seitr-sim/tools/build_mit_dataset.py
```

`../seitr-sim/index.html` runs the same equations on the same dataset. Its SEITR equations, contact multipliers, distance weights, and eight seeded cases are reproduced in `src/lib/simulation.ts`. The adapter adds immutable day snapshots for playback. It does not add or claim agent behavior.

Tests check population conservation, non-negative states, zero-transmission behavior, immutable results, parameter validation, and parity against the original JavaScript model for every compartment in every building on all 21 days. The parity tolerance is `1e-8`. `tests/chat-tools.test.ts` covers each assistant tool plus the mid-run intervention (`changeAt`) and per-building `contactScale` hooks added to `simulate()`.

### What the chat tools can and cannot ground

Fully grounded: hotspot ranking (peak infectious, infectious now, cumulative exposure, exposure rate over a day window), per-building parameters and outcomes, interventions that change the seven global parameters and/or a building's contact multiplier from day 0, and interventions starting on a chosen mid-run day.

Only partially grounded: `get_transmission_breakdown` reports the within-building vs between-building exposure split — the only breakdown the model tracks. It does not distinguish airborne vs contact/fomite transmission, and ventilation, mask compliance, and per-room isolation delay are not modeled. The tools state this explicitly rather than guessing.

Colors reflect `1 - exp(-exposure pressure)` for a susceptible member of a building cohort on the following day. Low is below 2%, moderate is 2% to below 8%, and high is at least 8%. These are illustrative display thresholds, not clinical cutoffs. Cumulative exposures include the eight seeded cases. Counts are rounded for display and individual rounded compartment values can differ from the population total by one or two.

This model is deterministic and uncalibrated. It does not produce confidence intervals, trace real encounters, or distinguish individual student schedules. The existing approximate distance matrix drives the model. The public geographic coordinates are for display only.

## Map data and attribution

`src/data/campus-map.json` is derived from OpenStreetMap data retrieved on September 19, 2026. Attribution is also visible on the map. Its embedded source metadata records the source and retrieval date.

- [OpenStreetMap contributors and ODbL licensing](https://www.openstreetmap.org/copyright)
- [Campus-area XML source](https://api.openstreetmap.org/api/0.6/map?bbox=-71.112,42.354,-71.084,42.365)
- [Charles River relation XML](https://api.openstreetmap.org/api/0.6/relation/4129875/full)
- [MIT campus reference](https://whereis.mit.edu/)

The derived geographic database is available in this repository under the Open Database License. Preserve its source metadata and attribution when redistributing it. OSM geometry is a public reference, not an official MIT occupancy or health dataset.

To refresh it, download the two XML sources above to local files and run:

```sh
python3 scripts/prepare_map.py /path/to/campus.osm /path/to/river.osm
```

## Next integration steps

1. Agree on the team's backend response format. The UI currently consumes the `Scenario`, `Snapshot`, and `BuildingState` types exported from `src/lib/simulation.ts`.
2. Replace the local `simulate()` call with a validated backend response using those types. Add loading and failure states for that network request. Keep stable building IDs so selection and map pins remain aligned.
3. Replace the sample student sizes with real occupancy data when it is available; the generator is the single place to change them.
4. Add Dropbox ingestion when an actual document-processing endpoint exists. The current Project data dialog is source information, not an upload form.
5. Add Elastic-backed explanations only when the backend returns relevant synthetic encounter records and citations. Current explanations come directly from model calculations.
6. Add voice input and narration through server-side sponsor integrations. Keep all credentials out of client components and out of `NEXT_PUBLIC_` environment variables. Label generated narration and continue to distinguish simulation from real campus conditions.

No Dropbox, Elastic, Deepgram, ElevenLabs, or OpenAI service is currently connected. No synthetic or personal data is sent to a third-party API by this frontend.
