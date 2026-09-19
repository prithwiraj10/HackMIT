# Freshman Flu campus frontend

A simulator for exploring fictional illness exposure across 14 MIT locations over 21 days. The map uses public geography. Populations, exposures, and outcomes are synthetic, not observations or predictions of conditions at MIT.

## Run locally

Requires Node.js 20.9 or later. Developed and checked with Node.js 24.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. No account, API key, map billing, or backend is needed. The map geometry is bundled locally. Scenario state is held in memory and resets when the page reloads. Export a run to keep its parameters and results.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

Development and build scripts use Next.js's supported Webpack option because Turbopack could not launch its build workers in the current host environment.

## What is implemented

- Campus map with real building footprints, street geometry, and the Charles River. Building pins show low, moderate, or high **modeled** exposure. Select or search for a building to inspect its details.
- Timeline with days 0 through 21, playback, pause, reset, and speed selection. All displayed metrics, colors, and explanations follow the selected day.
- Building details with the next-day exposure probability, synthetic population compartments, and a calculation-based explanation.
- Scenario lab with seven parameters from the existing model, presets, validation, and a preserved baseline.
- Comparison curves, cumulative exposures, peak infectious population within the selected window, and building-level differences.
- JSON export, data-source dialog, and model limitations page.
- Responsive layouts, labeled form controls, visible keyboard focus, and reduced-motion support.

Route planning, live alerts, student tracking, The Token Company, and Voloridge are intentionally excluded.

## Technology choices and Safara reference

Safara's [public dependency manifest](https://github.com/AdhyyanKumar/safara/blob/main/package.json) lists Next.js, React, TypeScript, Tailwind CSS, Google Maps React bindings, Three.js, React Three Fiber, and H3. Its repository was used to understand the stack and map-led component structure. No Safara source code or branding was copied.

This implementation uses Next.js 16, React 19, TypeScript, Tailwind 4 with custom CSS, Lucide icons, and D3 geographic projection. It keeps the map and details-panel pattern but uses local OpenStreetMap geometry instead of Google Maps. There is no routing requirement, 3D scene, or hex-grid calculation in this version, so those extra libraries are not included.

## Source layout

```text
src/app/                       Entry page, layout, design tokens, responsive CSS
src/components/dashboard.tsx   Navigation, playback, scenarios, comparison, dialogs
src/components/campus-map.tsx  Local SVG geography, markers, pan and zoom
src/components/trend-chart.tsx Comparison and timeline visualization
src/components/location-detail.tsx
src/lib/simulation.ts          Typed adapter for the existing SEITR equations
src/data/sample-buildings.json Original sample inputs, unchanged
src/data/campus-map.json       Derived public geographic dataset
tests/simulation.test.ts      Numerical correctness and parity checks
scripts/prepare_map.py         Rebuild geometry from public OSM XML exports
```

## Model and tests

The original `../seitr-sim/index.html` is unchanged. Its SEITR equations, contact multipliers, distance weights, and eight seeded cases are reproduced in `src/lib/simulation.ts`. The adapter adds immutable day snapshots for playback. It does not add or claim agent behavior.

Tests check population conservation, non-negative states, zero-transmission behavior, immutable results, parameter validation, and parity against the original JavaScript model for every compartment in every building on all 21 days. The parity tolerance is `1e-8`.

Colors reflect `1 - exp(-exposure pressure)` for a susceptible member of a fictional building cohort on the following day. Low is below 2%, moderate is 2% to below 8%, and high is at least 8%. These are illustrative display thresholds, not clinical cutoffs. Cumulative exposures include the eight seeded cases. Counts are rounded for display and individual rounded compartment values can differ from the population total by one or two.

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
3. Add Dropbox ingestion when an actual document-processing endpoint exists. The current Project data dialog is source information, not an upload form.
4. Add Elastic-backed explanations only when the backend returns relevant synthetic encounter records and citations. Current explanations come directly from model calculations.
5. Add voice input and narration through server-side sponsor integrations. Keep all credentials out of client components and out of `NEXT_PUBLIC_` environment variables. Label generated narration and continue to distinguish simulation from real campus conditions.

No Dropbox, Elastic, Deepgram, ElevenLabs, or OpenAI service is currently connected. No synthetic or personal data is sent to a third-party API by this frontend.
