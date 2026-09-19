import source from "@/data/mit-campus.json";

export type Compartments = {
  S: number;
  E: number;
  I: number;
  T: number;
  R: number;
};
export type Parameters = {
  beta: number;
  incub: number;
  inf: number;
  iso: number;
  fracT: number;
  decay: number;
  cross: number;
};
export type BuildingState = Compartments & {
  id: string;
  name: string;
  type: string;
  code: string;
  zone: string;
  about: string;
  coordinates: [number, number];
  N: number;
  contact: number;
  newExposures: number;
  exposureRate: number;
  internalPressure: number;
  externalPressure: number;
};
export type Snapshot = {
  day: number;
  buildings: BuildingState[];
  totals: Compartments;
  newExposures: number;
  cumulative: number;
};
export type Scenario = {
  name: string;
  params: Parameters;
  snapshots: Snapshot[];
};
export const DAYS = 21;
export const BASELINE: Parameters = {
  beta: 0.45,
  incub: 2,
  inf: 3,
  iso: 5,
  fracT: 0.6,
  decay: 350,
  cross: 0.25,
};
export const COMPARTMENTS = ["S", "E", "I", "T", "R"] as const;
export const STATE_LABELS = {
  S: "Susceptible",
  E: "Exposed",
  I: "Infectious",
  T: "Isolated",
  R: "Recovered",
};
export const STATE_COLORS = {
  S: "#94a4b3",
  E: "#d8a23e",
  I: "#d2674d",
  T: "#9788b4",
  R: "#467b65",
};
const CONTACT_RATES: Record<string, number> = {
  dorm: 1.4,
  "dining hall": 1.6,
  dining: 1.6,
  classroom: 0.8,
  library: 0.6,
  lab: 0.9,
  gym: 1.1,
  auditorium: 1,
  academic: 0.8,
  student_life: 1.3,
  events: 1,
  health: 0.7,
  outdoor: 0.4,
  off_campus: 1.2,
};
export const CAMPUS_SOURCE = source.source;
export const BUILDINGS = source.buildings.map((b) => ({
  id: b.id,
  name: b.name,
  type: b.type,
  code: b.mitNumber,
  zone: b.zone,
  about: b.about,
  coordinates: [b.lon, b.lat] as [number, number],
  N: b.population,
  contact: CONTACT_RATES[b.type] ?? 0.9,
}));
export const POPULATION = BUILDINGS.reduce((s, b) => s + b.N, 0);

function validate(p: Parameters) {
  if (Object.values(p).some((v) => !Number.isFinite(v)))
    throw new Error("Use finite numbers for all parameters.");
  if (
    p.beta < 0 ||
    p.beta > 1.5 ||
    p.incub < 0.5 ||
    p.incub > 10 ||
    p.inf < 0.5 ||
    p.inf > 14 ||
    p.iso < 0.5 ||
    p.iso > 14 ||
    p.fracT < 0 ||
    p.fracT > 1 ||
    p.decay < 50 ||
    p.decay > 1500 ||
    p.cross < 0 ||
    p.cross > 1
  )
    throw new Error("A parameter is outside the supported range.");
}

// Equations and initial conditions ported from seitr-sim/index.html.
// Keep the original simulator intact. This adapter adds immutable day snapshots
// and exposure summaries for the frontend; it does not add an agent model.
export function simulate(
  params: Parameters = BASELINE,
  name = "Baseline",
): Scenario {
  validate(params);
  let states: BuildingState[] = BUILDINGS.map((b) => ({
    ...b,
    S: b.N,
    E: 0,
    I: 0,
    T: 0,
    R: 0,
    newExposures: 0,
    exposureRate: 0,
    internalPressure: 0,
    externalPressure: 0,
  }));
  const seed = states
    .filter((b) => b.type === "dorm")
    .sort((a, b) => b.N - a.N)[0];
  seed.I = Math.min(5, seed.N);
  seed.S -= seed.I;
  seed.E = Math.min(3, seed.S);
  seed.S -= seed.E;
  const weights = source.distances.map((row, i) =>
    row.map((distance, j) =>
      i === j ? 0 : Math.exp(-distance / params.decay),
    ),
  );
  const pressure = (nodes: BuildingState[], i: number) => {
    const prevalence = nodes.map((b) => (b.I + 0.15 * b.T) / b.N);
    const internalPressure = params.beta * nodes[i].contact * prevalence[i];
    const externalPressure = prevalence.reduce(
      (sum, value, j) =>
        sum +
        (i === j ? 0 : params.beta * params.cross * weights[i][j] * value),
      0,
    );
    return {
      internalPressure,
      externalPressure,
      exposureRate: 1 - Math.exp(-internalPressure - externalPressure),
    };
  };
  const snapshots: Snapshot[] = [];
  function capture(day: number) {
    const buildings = states.map((b, i) => ({ ...b, ...pressure(states, i) }));
    const totals = { S: 0, E: 0, I: 0, T: 0, R: 0 };
    for (const b of buildings)
      for (const key of COMPARTMENTS) totals[key] += b[key];
    snapshots.push({
      day,
      buildings,
      totals,
      newExposures: buildings.reduce((sum, b) => sum + b.newExposures, 0),
      cumulative: POPULATION - totals.S,
    });
  }
  capture(0);
  for (let day = 1; day <= DAYS; day++) {
    states = states.map((b, i) => {
      const { exposureRate } = pressure(states, i);
      const newExposures = b.S * exposureRate;
      const toI = b.E * (1 - Math.exp(-1 / params.incub));
      const outI = b.I * (1 - Math.exp(-1 / params.inf));
      const toT = outI * params.fracT;
      const toR = b.T * (1 - Math.exp(-1 / params.iso));
      return {
        ...b,
        S: b.S - newExposures,
        E: b.E + newExposures - toI,
        I: b.I + toI - outI,
        T: b.T + toT - toR,
        R: b.R + outI - toT + toR,
        newExposures,
      };
    });
    capture(day);
  }
  return { name, params: { ...params }, snapshots };
}

export function risk(rate: number) {
  if (rate >= 0.08)
    return { label: "High", color: "#ca6149", className: "high" };
  if (rate >= 0.02)
    return { label: "Moderate", color: "#c59938", className: "moderate" };
  return { label: "Low", color: "#598876", className: "low" };
}
export function describeBuilding(b: BuildingState) {
  const total = b.internalPressure + b.externalPressure;
  const internalShare =
    total > 0 ? Math.round((b.internalPressure / total) * 100) : 0;
  const type = b.type.replace(/_/g, " ");
  return total === 0
    ? "There is no modeled exposure pressure at this location on this day."
    : `${internalShare}% of this location’s exposure pressure comes from within its own cohort. The other ${100 - internalShare}% comes from the model’s estimated walking-distance connections. Its ${type} contact multiplier is ${b.contact.toFixed(1)}×.`;
}
export const formatCount = (n: number) => Math.round(n).toLocaleString("en-US");
export const formatRate = (n: number) => `${(n * 100).toFixed(1)}%`;
