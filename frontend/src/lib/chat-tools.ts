import {
  BASELINE,
  BUILDINGS,
  DAYS,
  POPULATION,
  risk,
  simulate,
  type Parameters,
  type Scenario,
  type SimulateOptions,
} from "./simulation";

export type ToolCallRecord = {
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
};

let baseline: Scenario | null = null;
function getBaseline() {
  baseline ??= simulate(BASELINE, "Baseline");
  return baseline;
}

const PARAM_KEYS = [
  "beta",
  "incub",
  "inf",
  "iso",
  "fracT",
  "decay",
  "cross",
] as const;

const NOT_TRACKED_NOTE =
  "The SEITR model does not distinguish transmission modes (contact/fomite vs airborne), ventilation rates, or per-room mask compliance — it only tracks aggregate compartments plus the split between within-building and between-building exposure pressure.";

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveBuilding(query: unknown) {
  if (typeof query !== "string" || !query.trim()) return null;
  const raw = query.trim().toLowerCase();
  const q = normalizeName(query);
  if (!q) return null;
  const exact = BUILDINGS.find(
    (b) =>
      b.id === raw ||
      b.code.toLowerCase() === raw ||
      normalizeName(b.name) === q,
  );
  if (exact) return exact;
  return (
    BUILDINGS.find((b) => normalizeName(b.name).includes(q)) ??
    BUILDINGS.find((b) => q.includes(normalizeName(b.name))) ??
    null
  );
}

function unknownBuilding(query: unknown) {
  return {
    error: `No building matches "${String(query)}".`,
    valid_ids: BUILDINGS.map((b) => `${b.id} (${b.name})`),
  };
}

function clampDay(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), 0), DAYS);
}

function summarize(scenario: Scenario) {
  let peak = { day: 0, value: 0 };
  for (const snap of scenario.snapshots) {
    if (snap.totals.I > peak.value)
      peak = { day: snap.day, value: snap.totals.I };
  }
  const end = scenario.snapshots[DAYS];
  return {
    scenario: scenario.name,
    peak_infectious: { day: peak.day, people: Math.round(peak.value) },
    cumulative_exposed_day_21: {
      people: Math.round(end.cumulative),
      share_of_population: end.cumulative / POPULATION,
    },
    isolated_day_21: Math.round(end.totals.T),
  };
}

function buildingOutcome(scenario: Scenario, id: string) {
  let peak = { day: 0, value: 0 };
  for (const snap of scenario.snapshots) {
    const b = snap.buildings.find((x) => x.id === id);
    if (b && b.I > peak.value) peak = { day: snap.day, value: b.I };
  }
  const end = scenario.snapshots[DAYS].buildings.find((b) => b.id === id)!;
  return {
    peak_infectious: { day: peak.day, people: Math.round(peak.value) },
    ever_exposed_by_day_21: Math.round(end.N - end.S),
  };
}

function getHotspots(args: Record<string, unknown>) {
  const scenario = getBaseline();
  const metric =
    typeof args.metric === "string" ? args.metric : "peak_infectious";
  const window = args.time_window as Record<string, unknown> | undefined;
  const from = clampDay(args.from_day ?? window?.from, 0);
  const to = clampDay(args.to_day ?? window?.to, DAYS);
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const topN = Math.min(Math.max(Number(args.top_n) || 5, 1), 15);

  const rows = BUILDINGS.map((def, i) => {
    let peakI = 0;
    let peakDay = lo;
    let exposureSum = 0;
    let days = 0;
    for (let d = lo; d <= hi; d++) {
      const b = scenario.snapshots[d].buildings[i];
      if (b.I > peakI) {
        peakI = b.I;
        peakDay = d;
      }
      exposureSum += b.exposureRate;
      days++;
    }
    const endB = scenario.snapshots[hi].buildings[i];
    const before = lo === 0 ? null : scenario.snapshots[lo - 1].buildings[i];
    const exposedBefore = before ? before.N - before.S : 0;
    const metrics: Record<string, number> = {
      peak_infectious: peakI,
      infectious_now: endB.I,
      cumulative_exposure: endB.N - endB.S - exposedBefore,
      exposure_rate: exposureSum / days,
    };
    if (!(metric in metrics))
      return {
        error: `Unknown metric "${metric}". Use one of: ${Object.keys(metrics).join(", ")}.`,
      };
    return { def, value: metrics[metric], peakI, peakDay, endB };
  });
  const bad = rows.find((r) => "error" in r);
  if (bad) return bad;
  const ranked = (rows as Exclude<(typeof rows)[number], { error: string }>[])
    .sort((a, b) => b.value - a.value)
    .slice(0, topN)
    .map((r, i) => ({
      rank: i + 1,
      id: r.def.id,
      name: r.def.name,
      type: r.def.type,
      zone: r.def.zone,
      value: Number(r.value.toFixed(4)),
      ...(metric === "peak_infectious"
        ? { peak_day: r.peakDay }
        : metric === "cumulative_exposure"
          ? {
              share_of_building: Number((r.value / r.def.N).toFixed(3)),
            }
          : {}),
      modeled_risk: risk(r.endB.exposureRate).label,
    }));
  return {
    scenario: scenario.name,
    metric,
    window_days: [lo, hi],
    hotspots: ranked,
    note: "Values come from the baseline 21-day SEITR run over the MIT dataset.",
  };
}

function getRoomParameters(args: Record<string, unknown>) {
  const def = resolveBuilding(args.room_id);
  if (!def) return unknownBuilding(args.room_id);
  const scenario = getBaseline();
  const day = clampDay(args.day, DAYS);
  const at = scenario.snapshots[day].buildings.find((b) => b.id === def.id)!;
  const outcome = buildingOutcome(scenario, def.id);
  return {
    id: def.id,
    name: def.name,
    type: def.type,
    code: def.code,
    zone: def.zone,
    modeled_population: def.N,
    contact_multiplier: def.contact,
    baseline_state: {
      day,
      susceptible: Math.round(at.S),
      exposed: Math.round(at.E),
      infectious: Math.round(at.I),
      isolated: Math.round(at.T),
      recovered: Math.round(at.R),
    },
    baseline_outcome_by_day_21: outcome,
    tracked_room_parameters: [
      "population",
      "contact_multiplier",
      "type",
      "zone",
    ],
    not_tracked:
      "Ventilation rate, mask compliance, isolation delay and other per-room fields are not modeled. Global SEITR parameters (beta, incub, inf, iso, fracT, decay, cross) apply campus-wide.",
  };
}

function getTransmissionBreakdown(args: Record<string, unknown>) {
  const scenario = getBaseline();
  const target = args.room_id ? resolveBuilding(args.room_id) : null;
  if (args.room_id && !target) return unknownBuilding(args.room_id);
  const rows = (target ? [target] : BUILDINGS).map((def) => {
    let internal = 0;
    let external = 0;
    for (const snap of scenario.snapshots) {
      const b = snap.buildings.find((x) => x.id === def.id)!;
      internal += b.internalPressure;
      external += b.externalPressure;
    }
    const total = internal + external;
    return {
      id: def.id,
      name: def.name,
      within_building_share:
        total > 0 ? Number((internal / total).toFixed(3)) : null,
      between_building_share:
        total > 0 ? Number((external / total).toFixed(3)) : null,
    };
  });
  return {
    scope: target ? target.name : "all buildings",
    split_tracked: "within-building vs between-building exposure pressure",
    airborne_vs_contact: { tracked: false, note: NOT_TRACKED_NOTE },
    breakdown: rows,
  };
}

function parseIntervention(args: Record<string, unknown>) {
  const params: Parameters = { ...BASELINE };
  const overrides =
    args.params && typeof args.params === "object"
      ? (args.params as Record<string, unknown>)
      : {};
  for (const key of PARAM_KEYS) {
    const value = Number(overrides[key]);
    if (Number.isFinite(value)) params[key] = value;
  }
  const contactScale: Record<string, number> = {};
  const scale = Number(args.contact_scale);
  if (Number.isFinite(scale)) {
    if (args.room_id) {
      const def = resolveBuilding(args.room_id);
      if (!def) return { error: unknownBuilding(args.room_id) };
      contactScale[def.id] = scale;
    } else {
      for (const b of BUILDINGS) contactScale[b.id] = scale;
    }
  }
  return { params, contactScale };
}

function simulateIntervention(args: Record<string, unknown>) {
  const parsed = parseIntervention(args);
  if ("error" in parsed) return parsed;
  const { params, contactScale } = parsed;
  const options: SimulateOptions =
    Object.keys(contactScale).length > 0 ? { contactScale } : {};
  try {
    const modified = simulate(params, "Intervention", options);
    const result: Record<string, unknown> = {
      applied_at_day: 0,
      changes: {
        params_overridden: Object.fromEntries(
          PARAM_KEYS.filter((k) => params[k] !== BASELINE[k]).map((k) => [
            k,
            params[k],
          ]),
        ),
        ...(Object.keys(contactScale).length > 0
          ? { contact_scale: contactScale }
          : {}),
      },
      baseline: summarize(getBaseline()),
      intervention: summarize(modified),
    };
    if (args.room_id) {
      const def = resolveBuilding(args.room_id)!;
      result.building = {
        id: def.id,
        name: def.name,
        baseline: buildingOutcome(getBaseline(), def.id),
        intervention: buildingOutcome(modified, def.id),
      };
    }
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Simulation failed." };
  }
}

function simulateInterventionTiming(args: Record<string, unknown>) {
  const intervention =
    args.intervention && typeof args.intervention === "object"
      ? (args.intervention as Record<string, unknown>)
      : {};
  const parsed = parseIntervention(intervention);
  if ("error" in parsed) return parsed;
  const { params, contactScale } = parsed;
  const days = Array.isArray(args.trigger_days)
    ? args.trigger_days.map((d) => clampDay(d, 0))
    : [];
  if (days.length === 0)
    return { error: "trigger_days must be a non-empty array of days (0–21)." };
  const unique = [...new Set(days)].sort((a, b) => a - b).slice(0, 10);
  const outcomes = unique.map((day) => {
    const options: SimulateOptions =
      day === 0
        ? { contactScale }
        : {
            changeAt: {
              day,
              params,
              ...(Object.keys(contactScale).length > 0 ? { contactScale } : {}),
            },
          };
    const scenario = simulate(
      day === 0 ? params : BASELINE,
      `Intervention at day ${day}`,
      options,
    );
    return { intervention_starts_day: day, ...summarize(scenario) };
  });
  return {
    baseline: summarize(getBaseline()),
    outcomes,
    note: "Each run applies the intervention starting on the given day; earlier days run on baseline parameters.",
  };
}

const TOOLS: Record<string, (args: Record<string, unknown>) => unknown> = {
  get_hotspots: getHotspots,
  get_room_parameters: getRoomParameters,
  get_transmission_breakdown: getTransmissionBreakdown,
  simulate_intervention: simulateIntervention,
  simulate_intervention_timing: simulateInterventionTiming,
};

export function runTool(
  name: string,
  args: Record<string, unknown>,
): ToolCallRecord {
  const fn = TOOLS[name];
  let result: unknown;
  if (!fn) {
    result = {
      error: `Unknown tool "${name}". Available: ${Object.keys(TOOLS).join(", ")}.`,
    };
  } else {
    try {
      result = fn(args);
    } catch (err) {
      result = {
        error: err instanceof Error ? err.message : "Tool call failed.",
      };
    }
  }
  return { name, arguments: args, result };
}

const PARAM_RANGES: Record<(typeof PARAM_KEYS)[number], [number, number]> = {
  beta: [0, 1.5],
  incub: [0.5, 10],
  inf: [0.5, 14],
  iso: [0.5, 14],
  fracT: [0, 1],
  decay: [50, 1500],
  cross: [0, 1],
};

const PARAM_SCHEMA = {
  type: "object" as const,
  properties: Object.fromEntries(
    PARAM_KEYS.map((key) => [
      key,
      {
        type: "number",
        minimum: PARAM_RANGES[key][0],
        maximum: PARAM_RANGES[key][1],
        description: `Override the global ${key} parameter (baseline ${BASELINE[key]}, supported ${PARAM_RANGES[key][0]}–${PARAM_RANGES[key][1]}).`,
      },
    ]),
  ),
};

export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "get_hotspots",
      description:
        "Rank buildings by infection metrics in the baseline simulation run.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: [
              "peak_infectious",
              "infectious_now",
              "cumulative_exposure",
              "exposure_rate",
            ],
            description:
              "peak_infectious: max simultaneous infectious people; infectious_now: infectious at window end; cumulative_exposure: people ever exposed in the window; exposure_rate: mean modeled next-day exposure probability.",
          },
          top_n: {
            type: "integer",
            description: "How many buildings to return (max 15).",
          },
          from_day: {
            type: "integer",
            description: "Window start, 0–21 (default 0).",
          },
          to_day: {
            type: "integer",
            description: "Window end, 0–21 (default 21).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_room_parameters",
      description:
        "Return a building's modeled parameters (population, contact multiplier, type, zone), its baseline SEITR compartment counts on a given day (default: day 21), and its baseline outcome. Accepts a building id, MIT building number, or name.",
      parameters: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description: "Building id, code, or name.",
          },
          day: {
            type: "integer",
            description: `Simulation day (0–${DAYS}) for the compartment counts. Defaults to ${DAYS}.`,
          },
        },
        required: ["room_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_transmission_breakdown",
      description:
        "Return the tracked split between within-building and between-building exposure pressure. Airborne-vs-contact transmission is NOT modeled and is reported as not tracked.",
      parameters: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description:
              "Optional building id/code/name; omit for all buildings.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_intervention",
      description:
        "Re-run the simulation from day 0 with changed global SEITR parameters and/or a per-building contact_scale (0–3; e.g. 0.5 halves a building's internal mixing, modeling sanitizer/distancing there). Returns before/after outbreak metrics.",
      parameters: {
        type: "object",
        properties: {
          room_id: {
            type: "string",
            description:
              "Optional building to apply contact_scale to; omit for campus-wide.",
          },
          params: PARAM_SCHEMA,
          contact_scale: {
            type: "number",
            description: "Multiplier on the building contact rate, 0–3.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_intervention_timing",
      description:
        "Test an intervention that starts on different simulation days (0–21) and return the outcome of each run. Use for 'when should we act' questions.",
      parameters: {
        type: "object",
        properties: {
          intervention: {
            type: "object",
            description:
              "Same fields as simulate_intervention: params, contact_scale, room_id.",
            properties: {
              room_id: { type: "string" },
              params: PARAM_SCHEMA,
              contact_scale: { type: "number" },
            },
          },
          trigger_days: {
            type: "array",
            items: { type: "integer" },
            description: "Simulation days on which the intervention starts.",
          },
        },
        required: ["intervention", "trigger_days"],
      },
    },
  },
];
