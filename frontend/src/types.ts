export type RoomLabel = 'dorm' | 'lecture_hall' | 'dining' | 'gym' | 'corridor' | 'other'

export interface Room {
  id: number
  label: RoomLabel
  centroid: [number, number]
  area: number
  bbox: [number, number, number, number]
  polygon: [number, number][]
  corridor_score: number
}

export interface LayoutData {
  plan_id: string
  image_name: string
  width: number
  height: number
  rooms: Room[]
  edges: [number, number][]
  method: string
}

export interface Frame {
  t: number
  day: number
  hour: number
  room_counts: number[][] // [room][S,E,I,R]
  agents: [number, number][]
  agent_states: number[]
}

export interface SimResult {
  plan_id: string
  days: number
  frame_minutes: number
  curve: number[][] // [minute, S, E, I, R]
  frames: Frame[]
  summary: {
    final: Record<string, number>
    peak_infectious: number
    attack_rate: number
  }
}

export interface SimParams {
  n_agents: number
  days: number
  base_transmission: number
  incubation_days: number
  infectious_days: number
  initial_infected: number
  mask_fraction: number
  vaccinated_fraction: number
  seed: number
}
