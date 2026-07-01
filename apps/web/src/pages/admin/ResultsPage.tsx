import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api.js'
import { formatDateTime, formatDuration } from '../../lib/time.js'

interface TalkResult {
  id: string
  title: string
  presenter_name: string
  vote_count: number
}

interface ResultsResponse {
  talks: TalkResult[]
  results_public: boolean
  stats: {
    eligible_voters: number
    participating_voters: number
    total_votes: number
  }
  method: {
    type: 'approval'
    votes_per_voter: number
    notes: string
  }
}

interface Conference {
  voting_status: 'open' | 'closed'
  voting_opens_at: number | null
  voting_closes_at: number | null
  server_now: number
}

function useNow() {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}

export default function ResultsPage() {
  const qc = useQueryClient()
  const now = useNow()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-results'],
    queryFn: () => apiFetch<ResultsResponse>('/api/admin/results'),
    refetchInterval: 30_000,
  })

  const { data: conference } = useQuery({
    queryKey: ['conference'],
    queryFn: () => apiFetch<Conference>('/api/conference'),
  })

  const handleExport = async () => {
    const blob = await apiFetch<Blob>('/api/admin/results/export')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const publishResults = useMutation({
    mutationFn: (resultsPublic: boolean) =>
      apiFetch('/api/admin/results/publication', {
        method: 'PUT',
        body: JSON.stringify({ results_public: resultsPublic }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-results'] })
      qc.invalidateQueries({ queryKey: ['admin-audit'] })
    },
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  const talks = data?.talks ?? []
  const totalVotes = data?.stats.total_votes ?? talks.reduce((sum, t) => sum + t.vote_count, 0)
  const isOpen = conference?.voting_status === 'open'
  const boundary = isOpen ? conference?.voting_closes_at : conference?.voting_opens_at
  const offset = conference ? conference.server_now - Date.now() : 0
  const effectiveNow = now + offset
  const showCountdown = boundary !== null && boundary !== undefined && boundary > effectiveNow

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
          <h1 className="text-2xl font-bold text-slate-950">Results</h1>
          <p className="text-sm text-slate-500">{totalVotes} total votes cast</p>
        </div>
        <button onClick={handleExport}
          className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
          Export CSV
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">
              Public results are {data?.results_public ? 'visible' : 'hidden'}.
            </p>
            <p className="mt-1 text-slate-500">
              Publish when admins are ready for voters to see the ranked results page.
            </p>
          </div>
          <button
            onClick={() => publishResults.mutate(!(data?.results_public ?? false))}
            disabled={publishResults.isPending}
            className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {data?.results_public ? 'Hide Public Results' : 'Publish Results'}
          </button>
        </div>
        {data?.results_public && (
          <a href="/results" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:text-blue-800">
            View public results
          </a>
        )}
      </div>

      {conference && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className={isOpen ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
              {isOpen ? 'Voting is open; results may change.' : 'Voting is closed.'}
            </span>
            {showCountdown && (
              <span className="text-slate-600">
                {isOpen ? 'Closes in' : 'Opens in'} {formatDuration(boundary! - effectiveNow)}
              </span>
            )}
          </div>
          {conference.voting_closes_at && (
            <p className="mt-1 text-slate-500">Scheduled close: {formatDateTime(conference.voting_closes_at)}</p>
          )}
        </div>
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Participating voters</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{data.stats.participating_voters}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total votes</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{data.stats.total_votes}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Votes per voter</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{data.method.votes_per_voter}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-950">Method</p>
          <p className="mt-1">
            Approval voting: each voter can support up to {data.method.votes_per_voter} talks. Unused votes are allowed.
            Talk order is randomized per voter while voting is open to reduce position bias.
          </p>
          <p className="mt-1">{data.method.notes}</p>
        </div>
      )}

      {talks.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No talks or votes yet.
        </div>
      )}

      {talks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2 text-left font-medium text-slate-600">#</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Talk</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Presenter</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Votes</th>
              </tr>
            </thead>
            <tbody>
              {talks.map((talk, i) => (
                <tr key={talk.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-950">{talk.title}</td>
                  <td className="px-4 py-3 text-slate-600">{talk.presenter_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-950">{talk.vote_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
