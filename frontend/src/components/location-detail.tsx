import { ArrowUpRight, Building2, Info } from "lucide-react";
import {
  COMPARTMENTS,
  STATE_COLORS,
  STATE_LABELS,
  describeBuilding,
  formatCount,
  formatRate,
  risk,
  type BuildingState,
} from "@/lib/simulation";
import mapData from "@/data/campus-map.json";

export function LocationDetail({
  building: b,
  day,
  onMethod,
}: {
  building: BuildingState;
  day: number;
  onMethod: () => void;
}) {
  const r = risk(b.exposureRate);
  const code = mapData.locations.find((p) => p.id === b.id)?.code;
  return (
    <aside className="location-detail" aria-label="Selected building details">
      <div className="detail-top">
        <span className="eyebrow">LOCATION INSIGHT</span>
        <span className="building-number">{code}</span>
      </div>
      <div className="building-icon">
        <Building2 size={23} strokeWidth={1.5} />
      </div>
      <h2>{b.name}</h2>
      <p className="detail-type">
        {b.type} <span>·</span> Day {day}
      </p>
      <div className="exposure-box">
        <div>
          <span>Modeled exposure</span>
          <span className={`risk-badge ${r.className}`}>
            <i />
            {r.label}
          </span>
        </div>
        <strong>{formatRate(b.exposureRate)}</strong>
        <p>
          Next-day exposure probability for a susceptible member of this
          fictional cohort.
        </p>
      </div>
      <div className="detail-counts">
        <div>
          <span>Modeled population</span>
          <b>{formatCount(b.N)}</b>
        </div>
        <div>
          <span>Currently infectious</span>
          <b>{formatCount(b.I)}</b>
        </div>
        <div>
          <span>New exposures today</span>
          <b>{formatCount(b.newExposures)}</b>
        </div>
      </div>
      <div className="cohort-section">
        <h3>Population breakdown</h3>
        <div className="cohort-bar" aria-label="Population compartments">
          {COMPARTMENTS.map((key) => (
            <span
              key={key}
              style={{
                width: `${(b[key] / b.N) * 100}%`,
                background: STATE_COLORS[key],
              }}
            />
          ))}
        </div>
        <div className="cohort-labels">
          {COMPARTMENTS.map((key) => (
            <div key={key}>
              <i style={{ background: STATE_COLORS[key] }} />
              <span>{STATE_LABELS[key]}</span>
              <b>{formatCount(b[key])}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="explanation">
        <h3>
          <Info size={14} /> What drives this result?
        </h3>
        <p>{describeBuilding(b)}</p>
        <button onClick={onMethod}>
          Understand the model <ArrowUpRight size={14} />
        </button>
      </div>
    </aside>
  );
}
