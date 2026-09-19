import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  simulate,
  BASELINE,
  BUILDINGS,
  COMPARTMENTS,
  POPULATION,
  risk,
} from "../src/lib/simulation";

test("every day preserves population and non-negative compartments", () => {
  for (const params of [
    BASELINE,
    { ...BASELINE, beta: 1.5, cross: 1, incub: 0.5, inf: 0.5, iso: 0.5 },
  ]) {
    const scenario = simulate(params);
    assert.equal(scenario.snapshots.length, 22);
    for (const snap of scenario.snapshots) {
      assert.ok(
        Math.abs(
          Object.values(snap.totals).reduce((a, b) => a + b, 0) - POPULATION,
        ) < 1e-7,
      );
      for (const b of snap.buildings) {
        for (const key of COMPARTMENTS)
          assert.ok(Number.isFinite(b[key]) && b[key] >= -1e-10);
        assert.ok(b.exposureRate >= 0 && b.exposureRate <= 1);
      }
    }
  }
});

test("21-day baseline matches the untouched original simulator", () => {
  const original = readFileSync(
    new URL("../../seitr-sim/index.html", import.meta.url),
    "utf8",
  );
  const start = original.indexOf("function weights()");
  const end = original.indexOf("function snapshot()", start);
  const input = JSON.parse(
    readFileSync(
      new URL("../src/data/sample-buildings.json", import.meta.url),
      "utf8",
    ),
  );
  const nodes = BUILDINGS.map((b) => ({
    ...b,
    S: b.N,
    E: 0,
    I: 0,
    T: 0,
    R: 0,
  }));
  const seed = nodes
    .filter((b) => b.type === "dorm")
    .sort((a, b) => b.N - a.N)[0];
  seed.I = 5;
  seed.E = 3;
  seed.S -= 8;
  const context = vm.createContext({
    params: BASELINE,
    nodes,
    data: input,
    W: [],
    day: 0,
    history: [],
    flows: nodes.map(() => nodes.map(() => 0)),
    TREATED_CONTACT: 0.15,
    snapshot: () => ({}),
  });
  vm.runInContext(original.slice(start, end), context);
  const result = simulate();
  for (let day = 1; day <= 21; day++) {
    vm.runInContext("step()", context);
    for (let i = 0; i < nodes.length; i++)
      for (const key of COMPARTMENTS) {
        assert.ok(
          Math.abs(nodes[i][key] - result.snapshots[day].buildings[i][key]) <
            1e-8,
          `Day ${day}, building ${i}, ${key}`,
        );
      }
  }
});

test("zero transmission creates no new exposures and snapshots are independent", () => {
  const run = simulate({ ...BASELINE, beta: 0 });
  assert.equal(run.snapshots[21].cumulative, 8);
  assert.equal(run.snapshots[21].newExposures, 0);
  run.snapshots[0].buildings[0].S = -1;
  assert.ok(run.snapshots[1].buildings[0].S >= 0);
});

test("comparison input does not mutate baseline and invalid parameters fail", () => {
  const params = { ...BASELINE, cross: 0.1 };
  const run = simulate(params, "Less mixing");
  params.cross = 0.9;
  assert.equal(run.params.cross, 0.1);
  assert.equal(BASELINE.cross, 0.25);
  assert.throws(() => simulate({ ...BASELINE, beta: NaN }));
  assert.throws(() => simulate({ ...BASELINE, incub: 0 }));
  assert.equal(risk(0.08).label, "High");
});
