import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { api } from './api'
import { FloorPlanView } from './FloorPlanView'
import { Legend, SeirChart } from './SeirChart'
import type { LayoutData, RoomLabel, SimParams, SimResult } from './types'

const LABELS: RoomLabel[] = ['dorm', 'lecture_hall', 'dining', 'gym', 'corridor', 'other']

const DEFAULT_PARAMS: SimParams = {
  n_agents: 500,
  days: 14,
  base_transmission: 0.002,
  incubation_days: 2,
  infectious_days: 4,
  initial_infected: 3,
  mask_fraction: 0,
  vaccinated_fraction: 0,
  seed: 42,
}

export default function App() {
  const [samples, setSamples] = useState<string[]>([])
  const [layout, setLayout] = useState<LayoutData | null>(null)
  const [result, setResult] = useState<SimResult | null>(null)
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS)
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(8)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAgents, setShowAgents] = useState(true)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    api.samples().then((r) => setSamples(r.samples)).catch(() => setSamples([]))
  }, [])

  const run = useCallback(
    async <T,>(what: string, fn: () => Promise<T>): Promise<T | null> => {
      setBusy(what)
      setError(null)
      try {
        return await fn()
      } catch (e) {
        setError(String(e))
        return null
      } finally {
        setBusy(null)
      }
    },
    [],
  )

  const loadSample = (name: string) =>
    run('Extracting layout…', async () => {
      const l = await api.useSample(name)
      setLayout(l)
      setResult(null)
      setFrameIdx(0)
      setSelectedRoom(null)
      setPlaying(false)
    })

  const uploadFile = (file: File) =>
    run('Extracting layout…', async () => {
      const l = await api.upload(file)
      setLayout(l)
      setResult(null)
      setFrameIdx(0)
      setSelectedRoom(null)
      setPlaying(false)
    })

  const simulate = () => {
    if (!layout) return
    return run('Running simulation…', async () => {
      const r = await api.simulate(layout.plan_id, params)
      setResult(r)
      setFrameIdx(0)
      setPlaying(true)
    })
  }

  const relabel = (roomId: number, label: RoomLabel) => {
    if (!layout) return
    run('Saving label…', async () => setLayout(await api.setLabels(layout.plan_id, { [roomId]: label })))
  }

  useEffect(() => {
    if (!playing || !result) return
    timer.current = window.setInterval(() => {
      setFrameIdx((i) => {
        if (i + 1 >= result.frames.length) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, 1000 / speed)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [playing, speed, result])

  const frame = result ? result.frames[Math.min(frameIdx, result.frames.length - 1)] : null
  const roomTotals = useMemo(() => {
    if (!frame) return null
    return frame.room_counts.reduce(
      (acc, c) => acc.map((v, i) => v + c[i]),
      [0, 0, 0, 0],
    )
  }, [frame])

  return (
    <div className="app">
      <header>
        <h1>Freshman Flu Simulator</h1>
        <span className="sub">floor plan → rooms → agent-based SEIR playback</span>
      </header>

      <main>
        <section className="stage">
          {layout ? (
            <>
              <FloorPlanView
                layout={layout}
                frame={frame}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                showAgents={showAgents}
              />
              <div className="playback">
                <button onClick={() => setPlaying((p) => !p)} disabled={!result}>
                  {playing ? '❚❚ Pause' : '▶ Play'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={result ? result.frames.length - 1 : 0}
                  value={frameIdx}
                  disabled={!result}
                  onChange={(e) => {
                    setPlaying(false)
                    setFrameIdx(Number(e.target.value))
                  }}
                />
                <label className="speed">
                  speed
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                    {[2, 4, 8, 16, 32].map((s) => (
                      <option key={s} value={s}>
                        {s}x
                      </option>
                    ))}
                  </select>
                </label>
                <label className="speed">
                  <input type="checkbox" checked={showAgents} onChange={(e) => setShowAgents(e.target.checked)} />
                  agents
                </label>
                <span className="clock">
                  {frame ? `day ${frame.day} · ${String(frame.hour).padStart(2, '0')}:00` : 'no run yet'}
                </span>
              </div>
              {roomTotals && (
                <div className="totals">
                  S {roomTotals[0]} · E {roomTotals[1]} · I {roomTotals[2]} · R {roomTotals[3]}
                </div>
              )}
            </>
          ) : (
            <div className="empty">Load a sample floor plan or upload your own to get started.</div>
          )}
        </section>

        <aside>
          <div className="card">
            <h2>1. Floor plan</h2>
            <div className="samples">
              {samples.map((s) => (
                <button key={s} onClick={() => loadSample(s)}>
                  {s.replace(/\.(png|jpe?g)$/, '')}
                </button>
              ))}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
            {layout && (
              <p className="meta">
                {layout.rooms.length} regions · {layout.edges.length} doorway links · extraction:{' '}
                <code>{layout.method}</code>
              </p>
            )}
          </div>

          {layout && (
            <div className="card">
              <h2>2. Room labels</h2>
              <p className="meta">Click a region on the plan, then pick its type. Labels drive schedules.</p>
              {selectedRoom !== null && layout.rooms[selectedRoom] ? (
                <div className="labels">
                  <strong>Region {selectedRoom}</strong>
                  {LABELS.map((l) => (
                    <button
                      key={l}
                      className={layout.rooms[selectedRoom].label === l ? 'active' : ''}
                      onClick={() => relabel(selectedRoom, l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="meta">No region selected.</p>
              )}
            </div>
          )}

          <div className="card">
            <h2>3. Parameters</h2>
            {(
              [
                ['n_agents', 'Students', 10, 2000, 10],
                ['days', 'Days', 1, 30, 1],
                ['base_transmission', 'Transmission', 0.0002, 0.01, 0.0002],
                ['incubation_days', 'Incubation (days)', 0.5, 7, 0.5],
                ['infectious_days', 'Infectious (days)', 0.5, 10, 0.5],
                ['initial_infected', 'Initial infected', 1, 50, 1],
                ['mask_fraction', 'Masked fraction', 0, 1, 0.05],
                ['vaccinated_fraction', 'Vaccinated fraction', 0, 1, 0.05],
                ['seed', 'Seed', 0, 999, 1],
              ] as [keyof SimParams, string, number, number, number][]
            ).map(([key, label, min, max, step]) => (
              <label key={key} className="param">
                <span>
                  {label} <b>{params[key]}</b>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={params[key]}
                  onChange={(e) => setParams({ ...params, [key]: Number(e.target.value) })}
                />
              </label>
            ))}
            <button className="primary" disabled={!layout || !!busy} onClick={simulate}>
              Run simulation
            </button>
          </div>

          {result && (
            <div className="card">
              <h2>SEIR over time</h2>
              <SeirChart result={result} currentMinute={frame ? frame.t : 0} />
              <Legend />
              <p className="meta">
                peak infectious {result.summary.peak_infectious} · attack rate{' '}
                {(result.summary.attack_rate * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </aside>
      </main>

      {(busy || error) && <div className={`toast ${error ? 'err' : ''}`}>{error ?? busy}</div>}
    </div>
  )
}
