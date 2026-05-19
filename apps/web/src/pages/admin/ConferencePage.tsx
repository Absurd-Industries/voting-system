import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiFetch } from '../../lib/api.js'

interface Conference {
  id: string
  name: string
  description: string | null
  voting_opens_at: number | null
  voting_closes_at: number | null
  voting_force_status: 'open' | 'closed' | 'scheduled'
  votes_per_voter: number
}

interface SlotType {
  id: string
  duration_minutes: number
  count: number
}

function toDatetimeLocal(ts: number | null) {
  if (!ts) return ''
  return new Date(ts).toISOString().slice(0, 16)
}

function fromDatetimeLocal(s: string): number | null {
  if (!s) return null
  return new Date(s).getTime()
}

export default function ConferencePage() {
  const qc = useQueryClient()

  const { data: conf, isLoading } = useQuery({
    queryKey: ['admin-conference'],
    queryFn: () => apiFetch<Conference>('/api/admin/conference').catch(() => null),
  })

  const { data: slots = [] } = useQuery({
    queryKey: ['admin-slot-types'],
    queryFn: () => apiFetch<SlotType[]>('/api/admin/slot-types'),
    enabled: !!conf,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [forceStatus, setForceStatus] = useState<'open' | 'closed' | 'scheduled'>('scheduled')
  const [slotRows, setSlotRows] = useState<Array<{ duration_minutes: string; count: string }>>([
    { duration_minutes: '', count: '' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Populate form when conference data loads
  if (conf && !initialized) {
    setName(conf.name)
    setDescription(conf.description ?? '')
    setOpensAt(toDatetimeLocal(conf.voting_opens_at))
    setClosesAt(toDatetimeLocal(conf.voting_closes_at))
    setForceStatus(conf.voting_force_status)
    setInitialized(true)
  }

  // Populate slot rows when slot data loads (only if user hasn't touched them yet)
  if (slots.length > 0 && slotRows.every(r => !r.duration_minutes)) {
    setSlotRows(slots.map(s => ({
      duration_minutes: String(s.duration_minutes),
      count: String(s.count),
    })))
  }

  const saveConference = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        voting_opens_at: fromDatetimeLocal(opensAt),
        voting_closes_at: fromDatetimeLocal(closesAt),
        voting_force_status: forceStatus,
      }
      const method = conf ? 'PUT' : 'POST'
      return apiFetch('/api/admin/conference', {
        method,
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-conference'] })
      qc.invalidateQueries({ queryKey: ['conference'] })
      setSuccess('Conference saved.')
      setError(null)
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const saveSlots = useMutation({
    mutationFn: () => {
      const parsed = slotRows
        .filter(r => r.duration_minutes && r.count)
        .map(r => ({
          duration_minutes: parseInt(r.duration_minutes, 10),
          count: parseInt(r.count, 10),
        }))
      return apiFetch('/api/admin/slot-types', {
        method: 'PUT',
        body: JSON.stringify(parsed),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-slot-types'] })
      qc.invalidateQueries({ queryKey: ['admin-conference'] })
      qc.invalidateQueries({ queryKey: ['conference'] })
      setSuccess('Slot configuration saved.')
      setError(null)
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const totalSlots = slotRows
    .filter(r => r.count)
    .reduce((sum, r) => sum + parseInt(r.count || '0', 10), 0)

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{conf ? 'Conference Settings' : 'Create Conference'}</h1>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

      {/* Conference details */}
      <section className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-lg">Details</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={3} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <button onClick={() => saveConference.mutate()}
          disabled={!name || saveConference.isPending}
          className="px-4 py-2 bg-black text-white rounded text-sm font-medium disabled:opacity-50">
          {saveConference.isPending ? 'Saving...' : 'Save Details'}
        </button>
      </section>

      {/* Voting window — only show once conference exists */}
      {conf && (
        <section className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">Voting Window</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Opens At</label>
              <input type="datetime-local" value={opensAt} onChange={e => setOpensAt(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Closes At</label>
              <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Override Status</label>
            <div className="flex gap-3">
              {(['scheduled', 'open', 'closed'] as const).map(s => (
                <label key={s} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="force" value={s}
                    checked={forceStatus === s} onChange={() => setForceStatus(s)} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
            {forceStatus !== 'scheduled' && (
              <p className="text-xs text-amber-600 mt-1">
                Override active — schedule dates are ignored.
              </p>
            )}
          </div>
          <button onClick={() => saveConference.mutate()}
            disabled={saveConference.isPending}
            className="px-4 py-2 bg-black text-white rounded text-sm font-medium disabled:opacity-50">
            {saveConference.isPending ? 'Saving...' : 'Save Voting Settings'}
          </button>
        </section>
      )}

      {/* Slot types — only show once conference exists */}
      {conf && (
        <section className="bg-white border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Talk Slots</h2>
            <span className="text-sm text-gray-500">
              {totalSlots} total slots → {totalSlots} votes per voter
            </span>
          </div>
          <div className="space-y-2">
            {slotRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="number" placeholder="Duration (min)" value={row.duration_minutes}
                  onChange={e => setSlotRows(rows => rows.map((r, j) => j === i ? { ...r, duration_minutes: e.target.value } : r))}
                  className="border rounded px-3 py-2 text-sm w-36" />
                <span className="text-sm text-gray-500">min ×</span>
                <input
                  type="number" placeholder="Count" value={row.count}
                  onChange={e => setSlotRows(rows => rows.map((r, j) => j === i ? { ...r, count: e.target.value } : r))}
                  className="border rounded px-3 py-2 text-sm w-24" />
                <span className="text-sm text-gray-500">slots</span>
                <button onClick={() => setSlotRows(rows => rows.filter((_, j) => j !== i))}
                  className="text-red-500 text-sm hover:text-red-700">Remove</button>
              </div>
            ))}
          </div>
          <button onClick={() => setSlotRows(rows => [...rows, { duration_minutes: '', count: '' }])}
            className="text-sm text-blue-600 hover:underline">
            + Add slot type
          </button>
          <div>
            <button onClick={() => saveSlots.mutate()}
              disabled={saveSlots.isPending}
              className="px-4 py-2 bg-black text-white rounded text-sm font-medium disabled:opacity-50">
              {saveSlots.isPending ? 'Saving...' : 'Save Slot Configuration'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
