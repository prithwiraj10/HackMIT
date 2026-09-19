import type { LayoutData, RoomLabel, SimParams, SimResult } from './types'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  samples: () => fetch('/api/samples').then((r) => json<{ samples: string[] }>(r)),
  useSample: (name: string) =>
    fetch(`/api/plans/sample/${encodeURIComponent(name)}`, { method: 'POST' }).then((r) =>
      json<LayoutData>(r),
    ),
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch('/api/plans/upload', { method: 'POST', body: fd }).then((r) => json<LayoutData>(r))
  },
  setLabels: (planId: string, labels: Record<number, RoomLabel>) =>
    fetch(`/api/plans/${planId}/labels`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ labels }),
    }).then((r) => json<LayoutData>(r)),
  simulate: (planId: string, params: SimParams) =>
    fetch(`/api/plans/${planId}/simulate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    }).then((r) => json<SimResult>(r)),
  imageUrl: (planId: string) => `/api/plans/${planId}/image`,
}
