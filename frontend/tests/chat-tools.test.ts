import { test } from "node:test";
import assert from "node:assert/strict";
import { runTool } from "../src/lib/chat-tools";
import { simulate, BASELINE, DAYS, POPULATION } from "../src/lib/simulation";

test("get_hotspots ranks buildings and respects top_n and windows", () => {
  const res = runTool("get_hotspots", { metric: "peak_infectious", top_n: 3 });
  assert.equal(res.name, "get_hotspots");
  const out = res.result as {
    hotspots: { rank: number; id: string; value: number; peak_day: number }[];
    window_days: [number, number];
  };
  assert.equal(out.hotspots.length, 3);
  assert.deepEqual(
    out.hotspots.map((h) => h.rank),
    [1, 2, 3],
  );
  assert.ok(out.hotspots[0].value >= out.hotspots[1].value);
  assert.deepEqual(out.window_days, [0, 21]);
  const windowed = runTool("get_hotspots", {
    top_n: 5,
    from_day: 10,
    to_day: 5,
  }).result as { window_days: [number, number] };
  assert.deepEqual(windowed.window_days, [5, 10]);
});

test("get_hotspots counts cumulative exposure inclusively from from_day", () => {
  type Out = { hotspots: { id: string; value: number }[] };
  const run = (from: number, to: number) =>
    runTool("get_hotspots", {
      metric: "cumulative_exposure",
      from_day: from,
      to_day: to,
      top_n: 15,
    }).result as Out;
  const exposed = simulate(BASELINE, "b").snapshots.map((s) => {
    const b = s.buildings.find((x) => x.id === "maseeh")!;
    return b.N - b.S;
  });
  const maseeh = (out: Out) => out.hotspots.find((h) => h.id === "maseeh")!;
  assert.ok(exposed[0] > 0, "seeded cases are exposed on day 0");
  assert.ok(Math.abs(maseeh(run(0, DAYS)).value - exposed[DAYS]) < 1e-3);
  assert.ok(
    Math.abs(maseeh(run(5, 5)).value - (exposed[5] - exposed[4])) < 1e-3,
  );
  assert.ok(maseeh(run(5, 5)).value > 0);
});

test("get_hotspots rejects unknown metrics without fabricating", () => {
  const res = runTool("get_hotspots", { metric: "vibes" });
  assert.match(
    String((res.result as { error: string }).error),
    /Unknown metric/,
  );
});

test("get_room_parameters resolves names and reports untracked fields", () => {
  const res = runTool("get_room_parameters", { room_id: "maseeh" });
  const out = res.result as {
    name: string;
    modeled_population: number;
    not_tracked: string;
  };
  assert.equal(out.name, "Maseeh Hall");
  assert.equal(out.modeled_population, 500);
  assert.match(out.not_tracked, /not modeled/i);
  const bad = runTool("get_room_parameters", { room_id: "hogwarts" });
  assert.ok((bad.result as { error: string }).error);
});

test("get_transmission_breakdown is explicit about airborne not being tracked", () => {
  const res = runTool("get_transmission_breakdown", { room_id: "maseeh" });
  const out = res.result as {
    airborne_vs_contact: { tracked: boolean };
    breakdown: { within_building_share: number }[];
  };
  assert.equal(out.airborne_vs_contact.tracked, false);
  assert.equal(out.breakdown.length, 1);
  assert.ok(out.breakdown[0].within_building_share >= 0);
});

test("simulate_intervention re-runs the model and returns before/after", () => {
  const res = runTool("simulate_intervention", {
    room_id: "maseeh",
    contact_scale: 0.2,
    params: { fracT: 0.9 },
  });
  const out = res.result as {
    baseline: { cumulative_exposed_day_21: { people: number } };
    intervention: { cumulative_exposed_day_21: { people: number } };
    building: {
      baseline: { ever_exposed_by_day_21: number };
      intervention: { ever_exposed_by_day_21: number };
    };
  };
  assert.ok(
    out.intervention.cumulative_exposed_day_21.people <=
      out.baseline.cumulative_exposed_day_21.people,
  );
  assert.ok(
    out.building.intervention.ever_exposed_by_day_21 <=
      out.building.baseline.ever_exposed_by_day_21,
  );
});

test("simulate_intervention_timing produces real per-day outcomes", () => {
  const res = runTool("simulate_intervention_timing", {
    intervention: { params: { beta: 0.2 } },
    trigger_days: [1, 7, 14],
  });
  const out = res.result as {
    outcomes: {
      intervention_starts_day: number;
      cumulative_exposed_day_21: { people: number };
    }[];
  };
  assert.equal(out.outcomes.length, 3);
  assert.deepEqual(
    out.outcomes.map((o) => o.intervention_starts_day),
    [1, 7, 14],
  );
  // Later interventions should leave more cumulative exposure, strictly
  // separating these runs rather than replaying one result.
  assert.ok(
    out.outcomes[0].cumulative_exposed_day_21.people <
      out.outcomes[2].cumulative_exposed_day_21.people,
  );
});

test("mid-run changes actually alter the run and conserve population", () => {
  const run = simulate(BASELINE, "timed", {
    changeAt: { day: 10, params: { ...BASELINE, beta: 0 } },
  });
  assert.equal(run.snapshots.length, 22);
  for (const snap of run.snapshots)
    assert.ok(
      Math.abs(
        Object.values(snap.totals).reduce((a, b) => a + b, 0) - POPULATION,
      ) < 1e-7,
    );
  // With beta zeroed from day 10, no new exposures happen after that day.
  for (let d = 11; d <= DAYS; d++)
    assert.equal(run.snapshots[d].newExposures, 0);
});

test("contactScale shrinks a building's internal pressure at day 0", () => {
  const scaled = simulate(BASELINE, "scaled", {
    contactScale: { maseeh: 0 },
  });
  const maseeh = scaled.snapshots[1].buildings.find((b) => b.id === "maseeh")!;
  assert.equal(maseeh.internalPressure, 0);
});

test("runTool reports unknown tools", () => {
  const res = runTool("read_mind", {});
  assert.match(String((res.result as { error: string }).error), /Unknown tool/);
});
