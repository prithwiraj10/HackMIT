"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { Minus, Plus, Scan, Navigation } from "lucide-react";
import mapData from "@/data/campus-map.json";
import { BUILDINGS, risk, type BuildingState } from "@/lib/simulation";

// Keep SVG attributes stable across the server and browser math engines.
const pixel = (value: number) => Math.round(value * 1000) / 1000;

export function CampusMap({
  buildings,
  selected,
  onSelect,
}: {
  buildings: BuildingState[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 850, height: 550 });
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const projection = useMemo(
    () =>
      geoMercator().fitExtent(
        [
          [55, 100],
          [size.width - 55, size.height - 110],
        ],
        {
          type: "MultiPoint",
          coordinates: BUILDINGS.map((b) => b.coordinates),
        },
      ),
    [size],
  );
  const layers = useMemo(() => {
    const path = geoPath(projection);
    const groups: Record<string, string[]> = {
      water: [],
      green: [],
      building: [],
      street: [],
      path: [],
    };
    for (const f of mapData.features) {
      const kind =
        f.properties.kind === "road"
          ? ["footway", "path", "pedestrian", "cycleway", "service"].includes(
              f.properties.highway,
            )
            ? "path"
            : "street"
          : f.properties.kind;
      const d = path({
        type: "LineString",
        coordinates: f.geometry.coordinates,
      });
      if (d && groups[kind]) groups[kind].push(d);
    }
    return Object.fromEntries(
      Object.entries(groups).map(([k, v]) => [k, v.join(" ")]),
    );
  }, [projection]);
  const tx = (size.width / 2) * (1 - view.zoom) + view.x;
  const ty = (size.height / 2) * (1 - view.zoom) + view.y;
  return (
    <div
      className="campus-map"
      ref={container}
      aria-label="Interactive map of MIT campus buildings"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        drag.current = {
          x: e.clientX,
          y: e.clientY,
          startX: view.x,
          startY: view.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current)
          setView((v) => ({
            ...v,
            x: drag.current!.startX + e.clientX - drag.current!.x,
            y: drag.current!.startY + e.clientY - drag.current!.y,
          }));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <svg
        className="basemap"
        width={size.width}
        height={size.height}
        aria-hidden="true"
      >
        <g transform={`translate(${tx},${ty}) scale(${view.zoom})`}>
          <path d={layers.water} className="map-water" />
          <path d={layers.green} className="map-green" />
          <path d={layers.street} className="map-street-edge" />
          <path d={layers.street} className="map-street" />
          <path d={layers.path} className="map-footpath" />
          <path d={layers.building} className="map-buildings" />
          {buildings.map((b) => {
            const p = projection(b.coordinates)!;
            return (
              <circle
                key={b.id}
                cx={pixel(p[0])}
                cy={pixel(p[1])}
                r={pixel(18 + Math.min(b.exposureRate, 0.3) * 130)}
                fill={risk(b.exposureRate).color}
                opacity={0.13}
              />
            );
          })}
        </g>
      </svg>
      {buildings.map((b) => {
        const p = projection(b.coordinates)!;
        const r = risk(b.exposureRate);
        return (
          <button
            key={b.id}
            type="button"
            className={`map-pin ${selected === b.id ? "selected" : ""}`}
            aria-label={`${b.name}, ${r.label.toLowerCase()} simulated exposure`}
            aria-pressed={selected === b.id}
            style={
              {
                left: pixel(p[0] * view.zoom + tx),
                top: pixel(p[1] * view.zoom + ty),
                "--pin-color": r.color,
              } as React.CSSProperties
            }
            onClick={() => onSelect(b.id)}
          >
            <span className="pin-dot" />
            <span className="pin-code">{b.code}</span>
            <span className="pin-name">{b.name}</span>
          </button>
        );
      })}
      <div className="map-corner-label">
        <span className="eyebrow">CAMBRIDGE, MASSACHUSETTS</span>
        <span>Massachusetts Institute of Technology</span>
      </div>
      <div className="map-compass">
        <Navigation size={15} fill="currentColor" />
        <span>N</span>
      </div>
      <div className="map-legend">
        <span>Simulated exposure</span>
        <i className="low" />
        Low
        <i className="moderate" />
        Moderate
        <i className="high" />
        High
      </div>
      <div className="map-controls">
        <button
          aria-label="Zoom in"
          onClick={() =>
            setView((v) => ({ ...v, zoom: Math.min(3, v.zoom + 0.3) }))
          }
          disabled={view.zoom >= 3}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() =>
            setView((v) => ({ ...v, zoom: Math.max(0.8, v.zoom - 0.3) }))
          }
          disabled={view.zoom <= 0.8}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="Reset map view"
          onClick={() => setView({ zoom: 1, x: 0, y: 0 })}
        >
          <Scan size={17} />
        </button>
      </div>
      <a
        className="map-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
