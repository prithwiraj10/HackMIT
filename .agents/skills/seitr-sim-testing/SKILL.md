---
name: testing-seitr-simulation
description: Run and visually test the standalone SEITR campus simulation.
---

# Environment
- Serve `seitr-sim` from the repo with
  `python3 -m http.server 8765 --directory seitr-sim`.
- Open `http://localhost:8765/index.html`. No frontend npm build or backend
  service is needed. D3 v7 and Inter require CDN network access.

## Devin Secrets Needed
None.

# Runtime checks
- Initial data has 14 buildings and 3990 people. Reset is deterministic:
  Maseeh Hall has S452/E3/I5/T0/R0; aggregate S3982/E3/I5/T0/R0.
- Range inputs support Home/End for exact minimum/maximum values. Reset
  preserves slider values, stops playback, and resets the loaded dataset.
- Use native file dialogs for `sample-buildings.csv` and `.json`. Both should
  report 14 buildings. Check valid JSON with invalid matrix dimensions as
  well as syntax errors; verify Step, Reset, and resize after rejection.
- Hover rightmost and lowest nodes after resizing; inspect tooltip containment.
- For drag testing capture an intermediate screenshot with the button held.
- Aggregate displayed counts are rounded individually; allow up to2.5 people
  of rounding discrepancy. Read-only history snapshots give precise totals.
- Read-only MutationObserver timestamps on `#dayCounter` can verify tick-rate
  changes without replacing timers or modifying simulation state.
