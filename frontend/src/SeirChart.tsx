import type { SimResult } from './types'

const SERIES = [
  { idx: 1, name: 'Susceptible', color: '#3b82f6' },
  { idx: 2, name: 'Exposed', color: '#f59e0b' },
  { idx: 3, name: 'Infectious', color: '#ef4444' },
  { idx: 4, name: 'Recovered', color: '#22c55e' },
]

export function SeirChart({ result, currentMinute }: { result: SimResult; currentMinute: number }) {
  const w = 340
  const h = 180
  const pad = 26
  const curve = result.curve
  const stride = Math.max(1, Math.floor(curve.length / 400))
  const pts = curve.filter((_, i) => i % stride === 0)
  const maxT = curve[curve.length - 1][0] || 1
  const total = curve[0].slice(1).reduce((a, b) => a + b, 0)
  const x = (t: number) => pad + (t / maxT) * (w - pad - 6)
  const y = (v: number) => h - pad - (v / total) * (h - pad - 10)

  return (
    <svg width={w} height={h} className="chart">
      <line x1={pad} y1={h - pad} x2={w - 6} y2={h - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={8} x2={pad} y2={h - pad} stroke="#cbd5e1" />
      {SERIES.map((s) => (
        <polyline
          key={s.name}
          fill="none"
          stroke={s.color}
          strokeWidth={2}
          points={pts.map((p) => `${x(p[0])},${y(p[s.idx])}`).join(' ')}
        />
      ))}
      <line x1={x(currentMinute)} y1={8} x2={x(currentMinute)} y2={h - pad} stroke="#111827" strokeDasharray="4 3" />
      <text x={pad} y={h - 8} fontSize={10} fill="#64748b">day 0</text>
      <text x={w - 34} y={h - 8} fontSize={10} fill="#64748b">day {result.days}</text>
      <text x={4} y={14} fontSize={10} fill="#64748b">{total}</text>
    </svg>
  )
}

export function Legend() {
  return (
    <div className="legend">
      {SERIES.map((s) => (
        <span key={s.name}>
          <i style={{ background: s.color }} /> {s.name}
        </span>
      ))}
    </div>
  )
}
