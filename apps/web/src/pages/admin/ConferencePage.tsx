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

  if (isLoading) return <div className="text-sm uppercase tracking-wide text-stencil">Loading…</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="supertitle">Admin</p>
          <h1 className="page-title">{conf ? 'Conference Settings' : 'Create Conference'}</h1>
        </div>
        {conf && (
          <div className="kp-card px-4 py-3 text-sm">
            <span className={isCurrentlyOpen ? 'font-bold uppercase text-funded' : 'font-bold uppercase text-ink-faint'}>
              {isCurrentlyOpen ? 'Voting open' : 'Voting closed'}
            </span>
            {nextBoundary && nextBoundary > now && (
              <span className="ml-2 text-stencil">
                {isCurrentlyOpen ? 'closes in' : 'opens in'} {formatDuration(nextBoundary - now)}
              </span>
            )}
          </div>
        )}
      </div>

      {error && <div className="status-error">{error}</div>}
      {success && <div className="status-open">{success}</div>}

      {/* Conference details */}
      <section className="kp-card space-y-4 p-5 sm:p-6">
        <h2 className="section-title">Details</h2>
        <div>
          <label className="kp-label">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className="kp-input" />
        </div>
        <div>
          <label className="kp-label">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="kp-input" />
        </div>
        <button onClick={() => saveConference.mutate()} disabled={!name || saveConference.isPending} className="btn-ink">
          {saveConference.isPending ? 'Saving…' : 'Save Details'}
        </button>
      </section>

      {/* Voting window - only show once conference exists */}
      {conf && (
        <section className="kp-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="section-title">Voting Window</h2>
            <p className="mt-1 text-sm text-stencil">
              {isForced ? 'Manual override is active.' : 'Scheduled voting follows the local date and time below.'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="kp-label">Opens At</label>
              <input type="datetime-local" value={opensAt} onChange={e => setOpensAt(e.target.value)} className="kp-input" />
            </div>
            <div>
              <label className="kp-label">Closes At</label>
              <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} className="kp-input" />
            </div>
          </div>
          <div>
            <label className="kp-label mb-2">Override Status</label>
            <div className="flex gap-4">
              {(['scheduled', 'open', 'closed'] as const).map(s => (
                <label key={s} className="flex cursor-pointer items-center gap-1.5 text-sm uppercase tracking-wide">
                  <input type="radio" name="force" value={s} className="accent-stamp"
                    checked={forceStatus === s} onChange={() => setForceStatus(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            {forceStatus !== 'scheduled' && (
              <p className="mt-1 text-xs text-ink-faint">Override active; schedule dates are ignored.</p>
            )}
          </div>
          <button onClick={() => saveConference.mutate()} disabled={saveConference.isPending} className="btn-ink">
            {saveConference.isPending ? 'Saving…' : 'Save Voting Settings'}
          </button>
        </section>
      )}

      {/* Vote budget - only show once conference exists */}
      {conf && (
        <section className="kp-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="section-title">Vote Budget</h2>
            <p className="mt-1 text-sm text-stencil">
              Each voter gets this many votes. Talks are ranked by total votes; duration can be decided later while scheduling.
            </p>
          </div>
          <div className="max-w-xs">
            <label className="kp-label">Votes per voter</label>
            <input
              type="number"
              min="0"
              value={votesPerVoter}
              onChange={e => setVotesPerVoter(e.target.value)}
              className="kp-input min-h-11"
            />
            <p className="mt-2 text-xs text-stencil">
              Set to 0 to keep voting closed until the ballot is ready.
            </p>
          </div>
          <button onClick={() => saveConference.mutate()} disabled={saveConference.isPending || voteBudget < 0} className="btn-ink">
            {saveConference.isPending ? 'Saving…' : 'Save Vote Budget'}
          </button>
        </section>
      )}

      {conf && (
        <section className="kp-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="section-title">Admins</h2>
            <p className="mt-1 text-sm text-stencil">
              The first synced user becomes admin. Configured admin emails can add more.
            </p>
          </div>
          <div className="divide-y divide-ink/15 border-2 border-ink">
            {admins.map(admin => (
              <div key={admin.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">{admin.email}</p>
                  <p className="text-xs text-stencil">Added {formatDateTime(admin.created_at)}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove admin access for ${admin.email}?`)) removeAdmin.mutate(admin.id)
                  }}
                  disabled={removeAdmin.isPending || admins.length <= 1}
                  className="btn-label"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {conf && (
        <section className="kp-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="section-title">Audit Trail</h2>
            <p className="mt-1 text-sm text-stencil">
              Recent admin actions that affect the ballot, access, voting rules, or publication.
            </p>
          </div>
          {auditLogs.length === 0 ? (
            <div className="empty-state">No audit events yet.</div>
          ) : (
            <div className="divide-y divide-ink/15 border-2 border-ink">
              {auditLogs.map(log => (
                <div key={log.id} className="p-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-bold uppercase text-ink">
                      {log.action.replace(/_/g, ' ')} {log.target_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-stencil">{formatDateTime(log.created_at)}</p>
                  </div>
                  <p className="mt-1 text-xs text-stencil">
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
