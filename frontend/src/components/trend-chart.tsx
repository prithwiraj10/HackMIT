"use client";
import { useEffect, useRef, useState } from "react";
import { DAYS, formatCount, type Scenario } from "@/lib/simulation";

export function TrendChart({
  baseline,
  comparison,
  day,
  onDay,
}: {
  baseline: Scenario;
  comparison?: Scenario | null;
  day?: number;
  onDay?: (day: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(620);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const height = 220,
    left = 42,
    right = 18,
    top = 22,
    bottom = 32;
  const ceiling =
    Math.ceil(
      Math.max(
        ...baseline.snapshots.map((s) => s.totals.I),
        ...(comparison?.snapshots.map((s) => s.totals.I) ?? [0]),
        10,
      ) / 50,
    ) * 50;
  const x = (d: number) =>
    Number((left + (d / DAYS) * (width - left - right)).toFixed(3));
  const y = (n: number) =>
    Number(
      (height - bottom - (n / ceiling) * (height - top - bottom)).toFixed(3),
    );
  const line = (s: Scenario) =>
    s.snapshots
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day)},${y(p.totals.I)}`)
      .join(" ");
  const shownDay = hover ?? day;
  const base = shownDay == null ? null : baseline.snapshots[shownDay];
  return (
    <div className="trend-chart" ref={root}>
      <svg
        width="100%"
        height={height}
        role="img"
        aria-label={`Simulated infectious population across days 0 to 21${comparison ? ", baseline and comparison" : ""}`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={left}
              y1={y(f * ceiling)}
              x2={width - right}
              y2={y(f * ceiling)}
              className="chart-grid"
            />
            <text x={left - 10} y={y(f * ceiling) + 4} textAnchor="end">
              {formatCount(f * ceiling)}
            </text>
          </g>
        ))}
        {[0, 7, 14, 21].map((d) => (
          <text key={d} x={x(d)} y={height - 10} textAnchor="middle">
            {d === 0 ? "Day 0" : d}
          </text>
        ))}
        <text x={left} y={12}>
          Infectious people
        </text>
        <path
          d={`${line(baseline)} L${x(21)},${y(0)} L${x(0)},${y(0)} Z`}
          fill="var(--chart-fill)"
        />
        <path
          d={line(baseline)}
          fill="none"
          stroke="var(--olive)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {comparison && (
          <path
            d={line(comparison)}
            fill="none"
            stroke="var(--rust)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
        )}
        {shownDay != null && (
          <g>
            <line
              x1={x(shownDay)}
              x2={x(shownDay)}
              y1={top}
              y2={height - bottom}
              className="chart-cursor"
            />
            <circle
              cx={x(shownDay)}
              cy={y(baseline.snapshots[shownDay].totals.I)}
              r="4"
              fill="var(--olive)"
            />
          </g>
        )}
        <rect
          x={left}
          y={top}
          width={Math.max(1, width - left - right)}
          height={height - bottom - top}
          fill="transparent"
          onPointerMove={(e) => {
            const rect =
              e.currentTarget.ownerSVGElement!.getBoundingClientRect();
            setHover(
              Math.max(
                0,
                Math.min(
                  21,
                  Math.round(
                    ((e.clientX - rect.left - left) / (width - left - right)) *
                      21,
                  ),
                ),
              ),
            );
          }}
          onPointerLeave={() => setHover(null)}
          onClick={() => {
            if (hover != null) onDay?.(hover);
          }}
        />
      </svg>
      {hover != null && base && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(width - 176, Math.max(8, x(hover) - 74)) }}
        >
          Day {hover} · {baseline.name}: {formatCount(base.totals.I)}
          {comparison && (
            <>
              <br />
              Scenario: {formatCount(comparison.snapshots[hover].totals.I)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
