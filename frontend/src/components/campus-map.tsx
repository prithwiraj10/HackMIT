"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Globe2, Minus, Plus, Scan, Navigation } from "lucide-react";
import mapData from "@/data/campus-map.json";
import { BUILDINGS, risk, type BuildingState } from "@/lib/simulation";

// Keep SVG attributes stable across the server and browser math engines.
const pixel = (value: number) => Math.round(value * 1000) / 1000;

// MIT buildings sit close enough together that projected pins overlap, which
// makes neighbouring pins unclickable. Push overlapping pins apart along the
// pill's own proportions until every hit area is reachable.
const PIN_WIDTH = 42;
const PIN_HEIGHT = 22;

const MIT_CENTER = { lat: 42.3601, lng: -71.0942, altitude: 0 };
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

type Google3DContext = {
  map: google.maps.maps3d.Map3DElement;
  maps3d: google.maps.Maps3DLibrary;
  PinElement: typeof google.maps.marker.PinElement;
};

let googleLibraries: Promise<{
  maps3d: google.maps.Maps3DLibrary;
  PinElement: typeof google.maps.marker.PinElement;
}> | null = null;

function loadGoogleLibraries(apiKey: string) {
  if (!googleLibraries) {
    setOptions({
      key: apiKey,
      v: "weekly",
      language: "en",
      region: "US",
      authReferrerPolicy: "origin",
      mapIds: GOOGLE_MAP_ID ? [GOOGLE_MAP_ID] : undefined,
    });
    googleLibraries = Promise.all([
      importLibrary("maps3d"),
      importLibrary("marker"),
    ]).then(([maps3d, marker]) => ({
      maps3d,
      PinElement: marker.PinElement,
    }));
  }
  return googleLibraries;
}

function declutter(points: { id: string; x: number; y: number }[]) {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        let dx = (b.x - a.x) / PIN_WIDTH;
        let dy = (b.y - a.y) / PIN_HEIGHT;
        let gap = Math.hypot(dx, dy);
        if (gap >= 1) continue;
        if (gap === 0) {
          dx = (i + 1) / 1000;
          dy = (j + 1) / 1000;
          gap = Math.hypot(dx, dy);
        }
        const shift = (1 - gap) / 2;
        a.x -= ((dx / gap) * shift * PIN_WIDTH) / 2;
        a.y -= ((dy / gap) * shift * PIN_HEIGHT) / 2;
        b.x += ((dx / gap) * shift * PIN_WIDTH) / 2;
        b.y += ((dy / gap) * shift * PIN_HEIGHT) / 2;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return new Map(points.map((p) => [p.id, p]));
}

function StaticCampusMap({
  buildings,
  selected,
  onSelect,
  resetKey,
}: {
  buildings: BuildingState[];
  selected: string;
  onSelect: (id: string) => void;
  resetKey: number;
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
  useEffect(() => {
    setView({ zoom: 0.8, x: 0, y: 0 });
  }, [resetKey]);
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
  const pins = useMemo(
    () =>
      declutter(
        BUILDINGS.map((b) => {
          const p = projection(b.coordinates)!;
          return { id: b.id, x: p[0] * view.zoom, y: p[1] * view.zoom };
        }),
      ),
    [projection, view.zoom],
  );
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
        const p = pins.get(b.id)!;
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
                left: pixel(p.x + tx),
                top: pixel(p.y + ty),
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

function GoogleCampusMap({
  buildings,
  selected,
  onSelect,
  resetKey,
  apiKey,
}: {
  buildings: BuildingState[];
  selected: string;
  onSelect: (id: string) => void;
  resetKey: number;
  apiKey: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const markerElements = useRef<
    google.maps.maps3d.Marker3DInteractiveElement[]
  >([]);
  const [context, setContext] = useState<Google3DContext | null>(null);
  const [enteredCampus, setEnteredCampus] = useState(false);
  const [error, setError] = useState("");

  const flyToCampus = useCallback(
    (map: google.maps.maps3d.Map3DElement, durationMillis = 4200) => {
      map.flyCameraTo({
        endCamera: {
          center: MIT_CENTER,
          range: 2300,
          tilt: 62,
          heading: -24,
          roll: 0,
        },
        durationMillis,
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const mapHost = host.current;
    if (!mapHost) return;

    loadGoogleLibraries(apiKey)
      .then(({ maps3d, PinElement }) => {
        if (cancelled) return;
        const map = new maps3d.Map3DElement({
          center: { lat: 30, lng: -35, altitude: 0 },
          range: 18_000_000,
          tilt: 0,
          heading: 0,
          roll: 0,
          mode: "SATELLITE",
          gestureHandling: "GREEDY",
          defaultUIHidden: true,
          description:
            "Interactive 3D satellite map of the MIT campus with simulated exposure markers",
          ...(GOOGLE_MAP_ID ? { mapId: GOOGLE_MAP_ID } : {}),
        });
        map.className = "google-map-element";
        mapHost.replaceChildren(map);

        let flightStarted = false;
        const startFlight = (event: google.maps.maps3d.SteadyChangeEvent) => {
          if (!event.isSteady || flightStarted) return;
          flightStarted = true;
          flyToCampus(map);
        };
        const finishFlight = () => setEnteredCampus(true);
        const reportMapError = () =>
          setError(
            "Google 3D Maps could not load. Check the API key, billing, referrer restrictions, and Maps JavaScript API access.",
          );
        map.addEventListener("gmp-steadychange", startFlight);
        map.addEventListener("gmp-animationend", finishFlight, { once: true });
        map.addEventListener("gmp-error", reportMapError);
        setContext({ map, maps3d, PinElement });
      })
      .catch((reason: unknown) => {
        console.error("Could not initialize Google 3D Maps", reason);
        if (!cancelled)
          setError(
            "Google 3D Maps could not load. Check the API key, billing, referrer restrictions, and Maps JavaScript API access.",
          );
      });

    return () => {
      cancelled = true;
      markerElements.current.forEach((marker) => marker.remove());
      markerElements.current = [];
      mapHost.replaceChildren();
    };
  }, [apiKey, flyToCampus]);

  useEffect(() => {
    if (!context) return;
    markerElements.current.forEach((marker) => marker.remove());
    markerElements.current = buildings.map((building) => {
      const exposure = risk(building.exposureRate);
      const isSelected = building.id === selected;
      const pin = new context.PinElement({
        background: exposure.color,
        borderColor: isSelected ? "#ffffff" : "#f6f8f1",
        glyphColor: "#ffffff",
        glyphText: building.code,
        scale: isSelected
          ? 1.22
          : Math.min(1.05, 0.72 + building.exposureRate * 1.8),
      });
      const marker = new context.maps3d.Marker3DInteractiveElement({
        position: {
          lat: building.coordinates[1],
          lng: building.coordinates[0],
          altitude: isSelected ? 55 : 28,
        },
        altitudeMode: "RELATIVE_TO_MESH",
        collisionBehavior: "OPTIONAL_AND_HIDES_LOWER_PRIORITY",
        collisionPriority: isSelected
          ? 1000
          : 100 + building.exposureRate * 100,
        drawsWhenOccluded: isSelected,
        extruded: true,
        sizePreserved: true,
        title: `${building.name}: ${exposure.label.toLowerCase()} simulated exposure`,
        zIndex: isSelected ? 1000 : Math.round(building.exposureRate * 100),
      });
      marker.append(pin);
      marker.addEventListener("gmp-click", () => onSelect(building.id));
      context.map.append(marker);
      return marker;
    });
    return () => {
      markerElements.current.forEach((marker) => marker.remove());
      markerElements.current = [];
    };
  }, [buildings, context, onSelect, selected]);

  useEffect(() => {
    if (!context || !enteredCampus) return;
    const building = buildings.find((item) => item.id === selected);
    if (!building) return;
    context.map.flyCameraTo({
      endCamera: {
        center: {
          lat: building.coordinates[1],
          lng: building.coordinates[0],
          altitude: 20,
        },
        range: 900,
        tilt: 66,
        heading: context.map.heading ?? -24,
        roll: 0,
      },
      durationMillis: 1250,
    });
  }, [buildings, context, enteredCampus, selected]);

  useEffect(() => {
    if (!context || resetKey === 0) return;
    context.map.flyCameraTo({
      endCamera: {
        center: { lat: 30, lng: -35, altitude: 0 },
        range: 18_000_000,
        tilt: 0,
        heading: 0,
        roll: 0,
      },
      durationMillis: 1500,
    });
  }, [context, resetKey]);

  if (error) {
    return (
      <div className="map-fallback-shell">
        <StaticCampusMap
          buildings={buildings}
          selected={selected}
          onSelect={onSelect}
          resetKey={resetKey}
        />
        <div className="google-map-error" role="status">
          <strong>Showing the offline campus map</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="campus-map google-campus-map"
      aria-label="Interactive 3D satellite map of MIT campus"
    >
      <div className="google-map-host" ref={host} />
      {!context && (
        <div className="google-map-loading" role="status">
          <Globe2 size={25} />
          <strong>Loading the 3D campus…</strong>
          <span>Preparing satellite imagery and simulation markers</span>
        </div>
      )}
      <div className="map-legend google-map-legend">
        <span>Simulated exposure</span>
        <i className="low" />
        Low
        <i className="moderate" />
        Moderate
        <i className="high" />
        High
      </div>
    </div>
  );
}

export function CampusMap(props: {
  buildings: BuildingState[];
  selected: string;
  onSelect: (id: string) => void;
  resetKey: number;
}) {
  if (!GOOGLE_MAPS_KEY) return <StaticCampusMap {...props} />;
  return <GoogleCampusMap {...props} apiKey={GOOGLE_MAPS_KEY} />;
}
