import { useEffect, useRef, useState } from 'react'
import type { Frame, LayoutData } from './types'

const STATE_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e'] // S, E, I, R

function pointInPolygon(x: number, y: number, poly: [number, number][]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

interface Props {
  layout: LayoutData
  frame: Frame | null
  selectedRoom: number | null
  onSelectRoom: (id: number | null) => void
  showAgents: boolean
}

export function FloorPlanView({ layout, frame, selectedRoom, onSelectRoom, showAgents }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const scale = width / layout.width
  const height = layout.height * scale

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(scale, scale)

    for (const room of layout.rooms) {
      const counts = frame?.room_counts[room.id]
      const occupancy = counts ? counts.reduce((a, b) => a + b, 0) : 0
      const infectious = counts ? counts[2] : 0
      const intensity = occupancy > 0 ? Math.min(1, infectious / Math.max(4, occupancy * 0.5)) : 0
      ctx.beginPath()
      room.polygon.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.fillStyle =
        intensity > 0
          ? `rgba(239, 68, 68, ${0.12 + 0.6 * intensity})`
          : 'rgba(59, 130, 246, 0.08)'
      ctx.fill()
      ctx.lineWidth = (room.id === selectedRoom ? 5 : 2) / scale
      ctx.strokeStyle = room.id === selectedRoom ? '#111827' : 'rgba(30,64,175,0.45)'
      ctx.stroke()

      ctx.fillStyle = '#111827'
      ctx.font = `${Math.max(13, 14 / scale)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      const label = counts ? `${room.label} (${infectious}/${occupancy})` : room.label
      ctx.fillText(label, room.centroid[0], room.centroid[1])
    }

    if (frame && showAgents) {
      const r = Math.max(2.5, 3.5 / scale)
      frame.agents.forEach(([x, y], i) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = STATE_COLORS[frame.agent_states[i]]
        ctx.globalAlpha = frame.agent_states[i] === 2 ? 1 : 0.75
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }, [layout, frame, scale, selectedRoom, showAgents])

  return (
    <div ref={wrapRef} className="plan-wrap" style={{ height }}>
      <img src={`/api/plans/${layout.plan_id}/image`} alt="floor plan" width={width} height={height} />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - rect.left) / scale
          const y = (e.clientY - rect.top) / scale
          const hit = layout.rooms.find((r) => pointInPolygon(x, y, r.polygon))
          onSelectRoom(hit ? hit.id : null)
        }}
      />
    </div>
  )
}
