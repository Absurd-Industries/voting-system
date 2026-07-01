import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api.js'
import { formatDateTime, formatDuration, fromDatetimeLocal, toDatetimeLocal } from '../../lib/time.js'

interface Conference {
  id: string
  name: string
  description: string | null
  voting_opens_at: number | null
  voting_closes_at: number | null
  voting_force_status: 'open' | 'closed' | 'scheduled'
  votes_per_voter: number
}

interface AdminUser {
  id: string
  email: string
  created_at: number
}

interface AuditLog {
  id: string
  action: string
  target_type: string
  target_id: string | null
  details: unknown
  created_at: number
  admin_email: string | null
}

export default function ConferencePage() {
  const qc = useQueryClient()

  const { data: conf, isLoading } = useQuery({
    queryKey: ['admin-conference'],
    queryFn: () => apiFetch<Conference>('/api/admin/conference').catch(() => null),
  })

  const { data: admins = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch<AdminUser[]>('/api/admin/users'),
  })

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => apiFetch<AuditLog[]>('/api/admin/audit'),
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [forceStatus, setForceStatus] = useState<'open' | 'closed' | 'scheduled'>('scheduled')
  const [votesPerVoter, setVotesPerVoter] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!conf || initialized) return
    setName(conf.name)
    setDescription(conf.description ?? '')
    setOpensAt(toDatetimeLocal(conf.voting_opens_at))
    setClosesAt(toDatetimeLocal(conf.voting_closes_at))
    setForceStatus(conf.voting_force_status)
    setVotesPerVoter(String(conf.votes_per_voter))
    setInitialized(true)
  }, [conf, initialized])

  const saveConference = useMutation({
    mutationFn: () => {
      const parsedVotesPerVoter = parseInt(votesPerVoter || '0', 10)
      const payload = {
        name,
        description: description || null,
        voting_opens_at: fromDatetimeLocal(opensAt),
        voting_closes_at: fromDatetimeLocal(closesAt),
        voting_force_status: forceStatus,
        votes_per_voter: Number.isInteger(parsedVotesPerVoter) ? parsedVotesPerVoter : 0,
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
      qc.invalidateQueries({ queryKey: ['admin-audit'] })
      setSuccess('Conference saved.')
      setError(null)
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const removeAdmin = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-audit'] })
      setSuccess('Admin removed.')
      setError(null)
    },
    onError: (e: Error) => {
      setError(e.message)
      setSuccess(null)
    },
  })

  const voteBudget = parseInt(votesPerVoter || '0', 10)

  const now = Date.now()
  const isForced = forceStatus !== 'scheduled'
  const isCurrentlyOpen = conf
    ? forceStatus === 'open' || (
      forceStatus === 'scheduled' &&
      voteBudget > 0 &&
      Boolean(fromDatetimeLocal(opensAt)) &&
      Boolean(fromDatetimeLocal(closesAt)) &&
      now >= (fromDatetimeLocal(opensAt) ?? 0) &&
      now <= (fromDatetimeLocal(closesAt) ?? 0)
    )
    : false
  const nextBoundary = isCurrentlyOpen ? fromDatetimeLocal(closesAt) : fromDatetimeLocal(opensAt)

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
          <h1 className="text-2xl font-bold text-slate-950">{conf ? 'Conference Settings' : 'Create Conference'}</h1>
        </div>
        {conf && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className={isCurrentlyOpen ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
              {isCurrentlyOpen ? 'Voting open' : 'Voting closed'}
            </span>
            {nextBoundary && nextBoundary > now && (
              <span className="ml-2 text-slate-500">
                {isCurrentlyOpen ? 'closes in' : 'opens in'} {formatDuration(nextBoundary - now)}
              </span>
            )}
          </div>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      {/* Conference details */}
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Details</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <button onClick={() => saveConference.mutate()}
          disabled={!name || saveConference.isPending}
          className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
          {saveConference.isPending ? 'Saving...' : 'Save Details'}
        </button>
      </section>

      {/* Voting window — only show once conference exists */}
      {conf && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Voting Window</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isForced ? 'Manual override is active.' : 'Scheduled voting follows the local date and time below.'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Opens At</label>
              <input type="datetime-local" value={opensAt} onChange={e => setOpensAt(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Closes At</label>
              <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Override Status</label>
            <div className="flex gap-3">
              {(['scheduled', 'open', 'closed'] as const).map(s => (
                <label key={s} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="force" value={s}
                    checked={forceStatus === s} onChange={() => setForceStatus(s)} />
                  <span className="capitalize">{s}</span>
                </label>
              ))}
            </div>
            {forceStatus !== 'scheduled' && (
              <p className="mt-1 text-xs text-amber-700">Override active; schedule dates are ignored.</p>
            )}
          </div>
          <button onClick={() => saveConference.mutate()}
            disabled={saveConference.isPending}
            className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
            {saveConference.isPending ? 'Saving...' : 'Save Voting Settings'}
          </button>
        </section>
      )}

      {/* Vote budget — only show once conference exists */}
      {conf && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Vote Budget</h2>
            <p className="mt-1 text-sm text-slate-500">
              Each voter gets this many votes. Talks are ranked by total votes; duration can be decided later while scheduling.
            </p>
          </div>
          <div className="max-w-xs">
            <label className="mb-1 block text-sm font-medium text-slate-700">Votes per voter</label>
            <input
              type="number"
              min="0"
              value={votesPerVoter}
              onChange={e => setVotesPerVoter(e.target.value)}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-2 text-xs text-slate-500">
              Set to 0 to keep voting closed until the ballot is ready.
            </p>
          </div>
          <button onClick={() => saveConference.mutate()}
            disabled={saveConference.isPending || voteBudget < 0}
            className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
            {saveConference.isPending ? 'Saving...' : 'Save Vote Budget'}
          </button>
        </section>
      )}

      {conf && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Admins</h2>
            <p className="mt-1 text-sm text-slate-500">
              The first synced user becomes admin. Configured admin emails can add more.
            </p>
          </div>
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {admins.map(admin => (
              <div key={admin.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{admin.email}</p>
                  <p className="text-xs text-slate-500">Added {formatDateTime(admin.created_at)}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove admin access for ${admin.email}?`)) removeAdmin.mutate(admin.id)
                  }}
                  disabled={removeAdmin.isPending || admins.length <= 1}
                  className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {conf && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Audit Trail</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent admin actions that affect the ballot, access, voting rules, or publication.
            </p>
          </div>
          {auditLogs.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No audit events yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
              {auditLogs.map(log => (
                <div key={log.id} className="p-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-900">
                      {log.action.replace(/_/g, ' ')} {log.target_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {log.admin_email ?? 'Unknown admin'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
