"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileJson,
  FlaskConical,
  FolderOpen,
  GitCompareArrows,
  Layers3,
  Map,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { CampusMap } from "./campus-map";
import { TrendChart } from "./trend-chart";
import { LocationDetail } from "./location-detail";
import { ChatPanel } from "./chat-panel";
import { ThemeToggle } from "./theme-toggle";
import {
  BASELINE,
  BUILDINGS,
  DAYS,
  POPULATION,
  formatCount,
  formatRate,
  risk,
  simulate,
  type Parameters,
  type Scenario,
} from "@/lib/simulation";

type View = "simulation" | "scenarios" | "compare" | "method";
const NAV = [
  { id: "simulation" as const, label: "Campus simulation", Icon: Map },
  { id: "scenarios" as const, label: "Scenario lab", Icon: FlaskConical },
  { id: "compare" as const, label: "Compare results", Icon: GitCompareArrows },
  { id: "method" as const, label: "How it works", Icon: BookOpen },
];

export function Dashboard() {
  const baseline = useMemo(() => simulate(), []);
  const [view, setView] = useState<View>("simulation");
  const [day, setDay] = useState(7);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState(BUILDINGS[0].id);
  const [query, setQuery] = useState("");
  const [showLocationInsight, setShowLocationInsight] = useState(false);
  const [mapResetKey, setMapResetKey] = useState(0);
  const [comparison, setComparison] = useState<Scenario | null>(null);
  const [active, setActive] = useState("baseline");
  const [sources, setSources] = useState(false);
  const [notice, setNotice] = useState("");
  const current = active === "comparison" && comparison ? comparison : baseline;
  const snapshot = current.snapshots[day];
  const ranked = [...snapshot.buildings].sort(
    (a, b) => b.exposureRate - a.exposureRate,
  );
  const building = snapshot.buildings.find((b) => b.id === selected)!;
  const pickDay = (value: number) => {
    setPlaying(false);
    setDay(value);
  };
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setDay((d) => Math.min(DAYS, d + 1)),
      1100 / speed,
    );
    return () => window.clearInterval(timer);
  }, [playing, speed]);
  useEffect(() => {
    if (day === DAYS) setPlaying(false);
  }, [day]);
  useEffect(() => {
    if (view !== "simulation") setPlaying(false);
  }, [view]);
  const navigate = (next: View) => {
    setView(next);
    setNotice("");
  };
  const matches = BUILDINGS.filter((candidate) =>
    `${candidate.name} ${candidate.code} ${candidate.type}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="app-shell sim">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Activity size={22} />
          </span>
          <span>
            freshman<span className="brand-light">flu</span>
            <small>CAMPUS SIMULATION LAB</small>
          </span>
        </Link>
        <div className="header-context">
          <span className="divider" />
          <MapPin size={15} />
          <span>MIT · Cambridge, MA</span>
          <ChevronDown size={13} />
        </div>
        <div className="header-actions">
          <span className="simulation-label">
            <i /> Synthetic simulation
          </span>
          <button className="button quiet" onClick={() => setSources(true)}>
            <FolderOpen size={16} />
            <span>Project data</span>
          </button>
          <a
            className="github-link"
            href="https://github.com/prithwiraj10/HackMIT"
            target="_blank"
            rel="noreferrer"
            aria-label="Open the HackMIT repository"
          >
            <ArrowUpRight size={19} />
          </a>
        </div>
      </header>
      <aside className="sidebar">
        <span className="eyebrow sidebar-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-label={label}
              onClick={() => navigate(id)}
              className={view === id ? "nav-button active" : "nav-button"}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {view === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-scenario">
          <span className="eyebrow">CURRENT SCENARIO</span>
          <div className="scenario-mini">
            <span className="mini-icon">
              <Layers3 size={17} />
            </span>
            <div>
              <strong>{current.name}</strong>
              <small>21-day campus model</small>
            </div>
          </div>
          <dl>
            <div>
              <dt>Locations</dt>
              <dd>{BUILDINGS.length}</dd>
            </div>
            <div>
              <dt>Modeled population</dt>
              <dd>{formatCount(POPULATION)}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>SEITR</dd>
            </div>
          </dl>
        </div>
        <div className="sidebar-bottom">
          <button className="method-link" onClick={() => navigate("method")}>
            <CircleHelp size={16} /> About this simulation
          </button>
          <span className="sidebar-footer">Built at HackMIT 2026</span>
        </div>
      </aside>
      <main id="main-content" className="workspace">
        <div className="page-heading">
          <div>
            <div className="breadcrumb">
              WORKSPACE <ChevronRight size={11} />{" "}
              {view === "simulation"
                ? "CAMPUS OVERVIEW"
                : NAV.find((n) => n.id === view)?.label.toUpperCase()}
            </div>
            <h1>
              {view === "simulation"
                ? "A campus, in motion."
                : view === "scenarios"
                  ? "Explore a different what-if."
                  : view === "compare"
                    ? "One campus. Two possibilities."
                    : "A window into the model."}
            </h1>
            <p>
              {view === "simulation"
                ? "Follow the first three weeks. See where simulated exposure takes shape."
                : view === "scenarios"
                  ? "Change the assumptions, then explore how the results respond."
                  : view === "compare"
                    ? "Compare the same starting population under different assumptions."
                    : "Real campus geography. Fictional populations. Transparent assumptions."}
            </p>
          </div>
          <div className="heading-actions">
            {view === "simulation" && comparison && (
              <label className="scenario-select">
                <Layers3 size={15} />
                <select
                  aria-label="Displayed scenario"
                  value={active}
                  onChange={(e) => {
                    setActive(e.target.value);
                    setPlaying(false);
                  }}
                >
                  <option value="baseline">Baseline scenario</option>
                  <option value="comparison">{comparison.name}</option>
                </select>
              </label>
            )}
            <ThemeToggle />
          </div>
        </div>
        <div className="status-message" role="status">
          {notice}
        </div>
        {view === "simulation" && (
          <>
            <div className="metrics-row">
              <Metric
                icon={<Users size={17} />}
                label="Currently infectious"
                value={formatCount(snapshot.totals.I)}
                detail={`of ${formatCount(POPULATION)} modeled people`}
              />
              <Metric
                icon={<Activity size={17} />}
                label="New exposures"
                value={formatCount(snapshot.newExposures)}
                detail={`during simulated day ${day}`}
              />
              <Metric
                icon={<MapPin size={17} />}
                label="Highest modeled exposure"
                value={ranked[0].name}
                detail={`${formatRate(ranked[0].exposureRate)} next-day exposure`}
                text
              />
            </div>
            <section className="explorer" aria-label="Campus explorer">
              <div className="map-column">
                <div className="map-toolbar">
                  <div className="map-title">
                    <span className="status-dot" />
                    <strong>Campus overview</strong>
                    <span>{BUILDINGS.length} locations</span>
                  </div>
                  <button
                    className="map-reset-button"
                    type="button"
                    onClick={() => setMapResetKey((key) => key + 1)}
                  >
                    <RotateCcw size={14} />
                    Reset view
                  </button>
                </div>
                <div className="map-stage">
                  <CampusMap
                    buildings={snapshot.buildings}
                    selected={selected}
                    onSelect={(id) => {
                      setSelected(id);
                      setShowLocationInsight(true);
                    }}
                    resetKey={mapResetKey}
                  />
                  <div className="map-search-glass">
                    <span className="eyebrow">EXPLORE THE CAMPUS</span>
                    <label className="search-box">
                      <Search size={16} />
                      <input
                        aria-label="Find a building"
                        placeholder="Find a building…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      {query && (
                        <button
                          type="button"
                          aria-label="Clear building search"
                          onClick={() => setQuery("")}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </label>
                  </div>
                  {query.trim() && (
                    <div className="search-results" role="listbox">
                      <div className="search-results-heading">
                        <span>BUILDING RESULTS</span>
                        <small>{matches.length} found</small>
                      </div>
                      {matches.slice(0, 6).map((candidate) => {
                        const state = snapshot.buildings.find(
                          (item) => item.id === candidate.id,
                        );
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            role="option"
                            aria-selected={selected === candidate.id}
                            onClick={() => {
                              setSelected(candidate.id);
                              setQuery("");
                              setShowLocationInsight(true);
                            }}
                          >
                            <span className="result-icon">
                              <MapPin size={14} />
                            </span>
                            <span>
                              <strong>{candidate.name}</strong>
                              <small>
                                {candidate.code} ·{" "}
                                {candidate.type.replace(/_/g, " ")}
                              </small>
                            </span>
                            {state && (
                              <span
                                className={`risk-badge ${risk(state.exposureRate).className}`}
                              >
                                {formatRate(state.exposureRate)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {matches.length === 0 && (
                        <span className="empty-result">
                          No matching buildings
                        </span>
                      )}
                    </div>
                  )}
                  {showLocationInsight && (
                    <div className="location-glass">
                      <button
                        className="location-glass-close"
                        type="button"
                        aria-label="Close location insight"
                        onClick={() => setShowLocationInsight(false)}
                      >
                        <X size={15} />
                      </button>
                      <LocationDetail
                        building={building}
                        day={day}
                        onMethod={() => navigate("method")}
                      />
                    </div>
                  )}
                </div>
                <div className="timeline">
                  <div className="timeline-top">
                    <div className="timeline-day">
                      <span className="eyebrow">SIMULATION DAY</span>
                      <strong>
                        {String(day).padStart(2, "0")}
                        <small> / 21</small>
                      </strong>
                    </div>
                    <span className="play-state">
                      <i className={playing ? "playing" : ""} />
                      {playing
                        ? "Playing"
                        : day === DAYS
                          ? "Complete"
                          : "Paused"}
                    </span>
                    <div className="playback-buttons">
                      <button
                        className="icon-button"
                        aria-label="Restart simulation"
                        onClick={() => {
                          setDay(0);
                          setPlaying(false);
                        }}
                      >
                        <RotateCcw size={15} />
                      </button>
                      <label className="speed-select">
                        <select
                          aria-label="Playback speed"
                          value={speed}
                          onChange={(e) => setSpeed(Number(e.target.value))}
                        >
                          <option value={1}>1×</option>
                          <option value={2}>2×</option>
                          <option value={4}>4×</option>
                        </select>
                      </label>
                      <button
                        className="button primary play-button"
                        onClick={() => {
                          if (day === DAYS) setDay(0);
                          setPlaying(!playing);
                        }}
                      >
                        {playing ? (
                          <Pause size={14} fill="currentColor" />
                        ) : (
                          <Play size={14} fill="currentColor" />
                        )}
                        {playing ? "Pause" : day === DAYS ? "Replay" : "Play"}
                      </button>
                    </div>
                  </div>
                  <input
                    className="timeline-slider"
                    type="range"
                    min={0}
                    max={DAYS}
                    value={day}
                    onChange={(e) => pickDay(Number(e.target.value))}
                    aria-label="Simulation day"
                    aria-valuetext={`Day ${day} of 21`}
                    style={
                      {
                        "--progress": `${(day / DAYS) * 100}%`,
                      } as React.CSSProperties
                    }
                  />
                  <div className="timeline-labels">
                    <span>DAY 0</span>
                    <span>WEEK 1</span>
                    <span>WEEK 2</span>
                    <span>DAY 21</span>
                  </div>
                </div>
              </div>
            </section>
            <div className="overview-bottom">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>The shape of the outbreak</h2>
                    <p>Infectious population across the full simulated run</p>
                  </div>
                  <span className="chart-legend">
                    <i />
                    {current.name}
                  </span>
                </div>
                <TrendChart baseline={current} day={day} onDay={pickDay} />
              </section>
              <section className="panel hotspot-list">
                <div className="panel-heading">
                  <div>
                    <h2>Locations to explore</h2>
                    <p>Ranked by modeled exposure on day {day}</p>
                  </div>
                  <MapPin size={18} />
                </div>
                {ranked.slice(0, 4).map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelected(b.id);
                      setShowLocationInsight(true);
                      document.querySelector(".explorer")?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      });
                    }}
                  >
                    <span className="rank">0{i + 1}</span>
                    <div>
                      <strong>{b.name}</strong>
                      <small>{b.type}</small>
                    </div>
                    <span
                      className={`risk-badge ${risk(b.exposureRate).className}`}
                    >
                      {formatRate(b.exposureRate)}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </section>
            </div>
          </>
        )}
        {view === "scenarios" && (
          <ScenarioLab
            onRun={(scenario) => {
              setComparison(scenario);
              setActive("comparison");
              setView("compare");
              setNotice(
                `${scenario.name} is ready. Baseline preserved for comparison.`,
              );
            }}
          />
        )}
        {view === "compare" && (
          <Comparison
            baseline={baseline}
            comparison={comparison}
            onCreate={() => navigate("scenarios")}
            onExplore={() => {
              setActive("comparison");
              setDay(7);
              navigate("simulation");
            }}
          />
        )}
        {view === "method" && <Method />}
        <footer className="page-footer">
          <span>
            <FlaskConical size={13} /> All populations and outcomes are
            synthetic.
          </span>
          <span>Public MIT geography · Uncalibrated research prototype</span>
        </footer>
      </main>
      <ChatPanel />
      {sources && <Sources onClose={() => setSources(false)} />}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  text = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  text?: boolean;
}) {
  return (
    <div className={`metric ${text ? "text-metric" : ""}`}>
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

const PARAMETER_LABELS: Record<keyof Parameters, string> = {
  beta: "Transmission rate",
  cross: "Between-building mixing",
  fracT: "Fraction entering isolation",
  incub: "Incubation period",
  inf: "Infectious period",
  iso: "Isolation period",
  decay: "Distance decay scale",
};
function ScenarioLab({ onRun }: { onRun: (scenario: Scenario) => void }) {
  const [params, setParams] = useState({ ...BASELINE });
  const [name, setName] = useState("My scenario");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const controls: {
    key: keyof Parameters;
    min: number;
    max: number;
    step: number;
    description: string;
    unit?: string;
  }[] = [
    {
      key: "beta",
      min: 0.05,
      max: 1.5,
      step: 0.01,
      description: "How strongly contact produces exposure within this model.",
    },
    {
      key: "cross",
      min: 0,
      max: 1,
      step: 0.01,
      description:
        "How strongly the model connects different building cohorts.",
    },
    {
      key: "fracT",
      min: 0,
      max: 1,
      step: 0.05,
      description:
        "Share of people leaving the infectious state who enter isolation.",
    },
    {
      key: "incub",
      min: 0.5,
      max: 10,
      step: 0.5,
      description: "Average duration in the exposed state.",
      unit: "days",
    },
    {
      key: "inf",
      min: 0.5,
      max: 14,
      step: 0.5,
      description: "Average duration in the infectious state.",
      unit: "days",
    },
    {
      key: "iso",
      min: 0.5,
      max: 14,
      step: 0.5,
      description: "Average duration in the isolated state.",
      unit: "days",
    },
    {
      key: "decay",
      min: 50,
      max: 1500,
      step: 10,
      description:
        "Scale for the existing model’s distance-weighted connections.",
      unit: "m",
    },
  ];
  const renderControl = (control: (typeof controls)[number]) => (
    <div className="scenario-control" key={control.key}>
      <label htmlFor={`param-${control.key}`}>
        {PARAMETER_LABELS[control.key]}
        <output>
          {control.key === "fracT"
            ? `${Math.round(params[control.key] * 100)}%`
            : params[control.key]}{" "}
          {control.unit}
        </output>
      </label>
      <p>{control.description}</p>
      <input
        id={`param-${control.key}`}
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={params[control.key]}
        onChange={(e) =>
          setParams((p) => ({ ...p, [control.key]: Number(e.target.value) }))
        }
      />
      <div className="control-baseline">
        Baseline: {BASELINE[control.key]} {control.unit}
      </div>
    </div>
  );
  return (
    <div className="scenario-layout">
      <section className="panel scenario-form">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">DESIGN AN EXPERIMENT</span>
            <h2>Small changes. Different outcomes.</h2>
          </div>
          <SlidersHorizontal size={21} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              setError("Give your scenario a name.");
              return;
            }
            setError("");
            startTransition(() => {
              try {
                onRun(simulate(params, name.trim()));
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Could not run the scenario.",
                );
              }
            });
          }}
        >
          <label className="field-label" htmlFor="scenario-name">
            Scenario name
          </label>
          <input
            className="text-input"
            id="scenario-name"
            maxLength={45}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Reduced campus mixing"
          />
          {controls.slice(0, 3).map(renderControl)}
          <details className="advanced-settings">
            <summary>
              Advanced model settings <ChevronDown size={15} />
            </summary>
            {controls.slice(3).map(renderControl)}
          </details>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button"
              type="button"
              onClick={() => setParams({ ...BASELINE })}
            >
              Reset values
            </button>
            <button className="button primary" type="submit" disabled={pending}>
              <Play size={14} />
              {pending ? "Running…" : "Run scenario"}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </section>
      <div className="scenario-side">
        <section className="panel presets">
          <span className="eyebrow">A PLACE TO START</span>
          <h2>Try a simple hypothesis</h2>
          {[
            {
              name: "Less campus mixing",
              description: "Reduce the connection strength between buildings.",
              patch: { cross: 0.12 },
            },
            {
              name: "A shorter infectious period",
              description:
                "Change the modeled infectious period from 3 to 2 days.",
              patch: { inf: 2 },
            },
            {
              name: "Lower transmission",
              description: "Explore a lower contact transmission rate.",
              patch: { beta: 0.32 },
            },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setParams({ ...BASELINE, ...preset.patch });
                setName(preset.name);
              }}
            >
              <span className="preset-icon">
                <FlaskConical size={17} />
              </span>
              <div>
                <strong>{preset.name}</strong>
                <p>{preset.description}</p>
              </div>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </section>
        <section className="experiment-note">
          <Sparkles size={21} />
          <h3>A fair comparison, every time.</h3>
          <p>
            Both runs start with the same fictional population and initial
            exposures. Only your chosen parameters change.
          </p>
          <p>
            The existing model is deterministic. Repeating the same inputs
            produces the same result.
          </p>
        </section>
      </div>
    </div>
  );
}

function Comparison({
  baseline,
  comparison,
  onCreate,
  onExplore,
}: {
  baseline: Scenario;
  comparison: Scenario | null;
  onCreate: () => void;
  onExplore: () => void;
}) {
  if (!comparison)
    return (
      <section className="empty-state panel">
        <span className="empty-icon">
          <GitCompareArrows size={32} strokeWidth={1.4} />
        </span>
        <span className="eyebrow">YOUR NEXT EXPERIMENT</span>
        <h2>What if one assumption changed?</h2>
        <p>
          Create a scenario to see its curve, building results, and total
          exposures alongside the original baseline.
        </p>
        <button className="button primary" onClick={onCreate}>
          Open scenario lab <ArrowRight size={16} />
        </button>
      </section>
    );
  const baseFinal = baseline.snapshots[DAYS],
    newFinal = comparison.snapshots[DAYS];
  const basePeak = baseline.snapshots.reduce((a, b) =>
    a.totals.I > b.totals.I ? a : b,
  );
  const newPeak = comparison.snapshots.reduce((a, b) =>
    a.totals.I > b.totals.I ? a : b,
  );
  const change =
    ((newFinal.cumulative - baseFinal.cumulative) / baseFinal.cumulative) * 100;
  return (
    <div className="comparison-content">
      <div className="comparison-banner">
        <div>
          <span className="eyebrow">EXPERIMENT COMPLETE</span>
          <h2>{comparison.name}</h2>
          <p>
            {Math.abs(change).toFixed(1)}% {change <= 0 ? "fewer" : "more"}{" "}
            cumulative exposures by day 21 under these assumptions.
          </p>
        </div>
        <button className="button primary" onClick={onExplore}>
          Explore on map <ArrowRight size={16} />
        </button>
      </div>
      <section className="panel comparison-chart">
        <div className="panel-heading">
          <div>
            <h2>How the curves compare</h2>
            <p>Same initial conditions · 21 simulated days</p>
          </div>
          <div className="chart-legends">
            <span className="chart-legend">
              <i />
              Baseline
            </span>
            <span className="chart-legend variant">
              <i />
              {comparison.name}
            </span>
          </div>
        </div>
        <TrendChart baseline={baseline} comparison={comparison} />
      </section>
      <div className="compare-metrics">
        {[
          {
            label: "Cumulative exposures",
            base: baseFinal.cumulative,
            next: newFinal.cumulative,
          },
          {
            label: "Peak infectious population",
            base: basePeak.totals.I,
            next: newPeak.totals.I,
          },
          {
            label: "Peak day within this run",
            base: basePeak.day,
            next: newPeak.day,
          },
        ].map((m) => (
          <div className="panel compare-metric" key={m.label}>
            <span>{m.label}</span>
            <div>
              <strong>{formatCount(m.base)}</strong>
              <ArrowRight size={18} />
              <strong>{formatCount(m.next)}</strong>
            </div>
            <small>
              Baseline <span>New scenario</span>
            </small>
          </div>
        ))}
      </div>
      <section className="panel comparison-table">
        <div className="panel-heading">
          <div>
            <h2>A closer look, building by building</h2>
            <p>Peak next-day exposure probability across each complete run</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Baseline peak</th>
                <th>Scenario peak</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {BUILDINGS.map((b, i) => {
                const base = Math.max(
                  ...baseline.snapshots.map((s) => s.buildings[i].exposureRate),
                );
                const next = Math.max(
                  ...comparison.snapshots.map(
                    (s) => s.buildings[i].exposureRate,
                  ),
                );
                return (
                  <tr key={b.id}>
                    <td>
                      {b.name}
                      <small>{b.type}</small>
                    </td>
                    <td>{formatRate(base)}</td>
                    <td>{formatRate(next)}</td>
                    <td className={next < base ? "decreased" : ""}>
                      {((next - base) * 100).toFixed(1)} pp
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="comparison-footnote">
        <CircleHelp size={15} />
        <p>
          These are deterministic model results. They do not provide confidence
          intervals or predict real conditions at MIT. Exposures include the
          eight seeded cases.
        </p>
      </div>
    </div>
  );
}

function Method() {
  return (
    <div className="method-content">
      <section className="method-intro panel">
        <span className="eyebrow">BUILT TO BE EXPLORED</span>
        <h2>
          Every number has a source.
          <br />
          Every outcome has an assumption.
        </h2>
        <p>
          This frontend runs the SEITR equations already in your team’s
          repository. It maps {BUILDINGS.length} MIT building cohorts with
          sample student sizes onto public MIT geography and keeps each day
          available for replay.
        </p>
      </section>
      <div className="method-grid">
        {[
          {
            n: "01",
            title: "Public campus geography",
            content:
              "Building outlines, streets, and the Charles River come from OpenStreetMap. Each location pin is derived from its building outline. No location tracking is used.",
          },
          {
            n: "02",
            title: "Sample building cohorts",
            content: `The MIT dataset defines ${formatCount(POPULATION)} modeled people across ${BUILDINGS.length} locations: dorm counts are approximate bed counts and other buildings use a typical concurrent weekday occupancy. They are estimates, not enrollment, visits, or live occupancy.`,
          },
          {
            n: "03",
            title: "The existing SEITR model",
            content:
              "People move between susceptible, exposed, infectious, treated/isolated, and recovered states. Within-building contact and an approximate distance matrix determine exposure pressure.",
          },
          {
            n: "04",
            title: "Results you can inspect",
            content:
              "Map colors show the calculated next-day exposure probability: low below 2%, moderate from 2% to below 8%, high at 8% and above. These display thresholds are illustrative, not medical cutoffs.",
          },
        ].map((item) => (
          <section className="panel method-card" key={item.n}>
            <span>{item.n}</span>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
          </section>
        ))}
      </div>
      <section className="panel model-notes">
        <h2>What this version does and does not measure</h2>
        <p>
          The model is deterministic and has not been calibrated to campus
          illness data. Distance weighting is a simplifying assumption from the
          existing simulator, not an observed contact network. Fractional people
          are expected values; displayed counts are rounded.
        </p>
        <p>
          This version does not yet include individual movement, LLM behavior,
          real encounter logs, confidence intervals, or sponsor services. The
          frontend is structured so the team can connect those outputs later
          without changing the map and playback experience.
        </p>
        <div className="source-links">
          <a href="https://whereis.mit.edu/" target="_blank" rel="noreferrer">
            MIT campus reference <ArrowUpRight size={14} />
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap attribution <ArrowUpRight size={14} />
          </a>
          <a
            href="https://github.com/prithwiraj10/HackMIT"
            target="_blank"
            rel="noreferrer"
          >
            Project repository <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
    </div>
  );
}

function Sources({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      className="sources-dialog"
      aria-labelledby="project-data-title"
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PROJECT DATA</span>
            <h2 id="project-data-title">Everything behind this run</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close project data"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          The current frontend uses the files already bundled with the project.
        </p>
        {[
          {
            title: "MIT campus map",
            detail: "Public OpenStreetMap geometry · stored locally",
            Icon: Map,
          },
          {
            title: "MIT building cohorts",
            detail: `${BUILDINGS.length} locations · seitr-sim/data · mit-campus.json`,
            Icon: FileJson,
          },
          {
            title: "SEITR model",
            detail: "Original equations · baseline parity verified",
            Icon: Activity,
          },
        ].map(({ title, detail, Icon }) => (
          <div className="source-row" key={title}>
            <Icon size={20} />
            <div>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
            <Check size={17} />
          </div>
        ))}
        <div className="integration-note">
          <FolderOpen size={18} />
          <div>
            <strong>Ready for your team’s integrations</strong>
            <p>
              Dropbox ingestion, Elastic explanations, and voice services can
              connect in the next stage. No account is connected in this
              frontend version.
            </p>
          </div>
        </div>
        <button className="button primary" onClick={onClose}>
          Back to the campus <ArrowRight size={15} />
        </button>
      </div>
    </dialog>
  );
}
