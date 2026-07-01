import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { formatDateTime, formatDuration } from '../lib/time.js'

interface Conference {
  id: string
  name: string
  description: string | null
  voting_status: 'open' | 'closed'
  votes_per_voter: number
  voting_opens_at: number | null
  voting_closes_at: number | null
  server_now: number
}

interface Talk {
  id: string
  title: string
  description: string | null
  presenter_name: string
  presenter_bio: string | null
}

interface VotesResponse {
  votes: string[]
  votes_per_voter: number
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}

export default function VotePage() {
  const qc = useQueryClient()
  const now = useNow()

  const { data: conference, isLoading: confLoading } = useQuery({
    queryKey: ['conference'],
    queryFn: () => apiFetch<Conference>('/api/conference'),
  })

  const { data: talks = [], isLoading: talksLoading } = useQuery({
    queryKey: ['talks'],
    queryFn: () => apiFetch<Talk[]>('/api/talks'),
    enabled: !!conference,
  })

  const { data: myVotes } = useQuery({
    queryKey: ['my-votes'],
    queryFn: () => apiFetch<VotesResponse>('/api/votes/mine'),
    enabled: !!conference,
  })

  const votedIds = new Set(myVotes?.votes ?? [])
  const votesUsed = votedIds.size
  const votesTotal = conference?.votes_per_voter ?? myVotes?.votes_per_voter ?? 0
  const isAdminPreview = myVotes?.votes_per_voter === 0 && votesTotal > 0
  const clientServerOffset = useMemo(() => (
    conference ? conference.server_now - Date.now() : 0
  ), [conference?.server_now])
  const effectiveNow = now + clientServerOffset

  const castVote = useMutation({
    mutationFn: (talkId: string) =>
      apiFetch(`/api/votes/${talkId}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-votes'] }),
  })

  const retractVote = useMutation({
    mutationFn: (talkId: string) =>
      apiFetch(`/api/votes/${talkId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-votes'] }),
  })

  if (confLoading || talksLoading) {
    return <div className="text-gray-500">Loading...</div>
  }

  if (!conference) {
    return <div className="text-gray-500">No conference configured yet.</div>
  }

  const isOpen = conference.voting_status === 'open'
  const votingOpensAt = formatDateTime(conference.voting_opens_at)
  const votingClosesAt = formatDateTime(conference.voting_closes_at)
  const countdownTarget = isOpen ? conference.voting_closes_at : conference.voting_opens_at
  const showCountdown = countdownTarget !== null && countdownTarget > effectiveNow
  const countdownLabel = isOpen ? 'Time left' : 'Opens in'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Current conference</p>
          <h1 className="text-2xl font-bold text-slate-950">{conference.name}</h1>
          {conference.description && (
            <p className="mt-2 text-sm leading-6 text-slate-600">{conference.description}</p>
          )}
        </div>
        <div className="rounded-lg bg-slate-950 px-4 py-3 text-white sm:min-w-44">
          <p className="text-xs font-medium text-slate-300">{showCountdown ? countdownLabel : isOpen ? 'Voting status' : 'Voting closed'}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {showCountdown ? formatDuration(countdownTarget! - effectiveNow) : isOpen ? 'Open' : 'Closed'}
          </p>
        </div>
      </div>

      {isOpen ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">Voting is open</span>
            <span>{isAdminPreview ? `${votesTotal} votes per voter` : `${votesUsed} of ${votesTotal} votes used`}</span>
          </div>
          {votingClosesAt && <p className="mt-1 text-emerald-800">Closes {votingClosesAt}</p>}
          {isAdminPreview && <p className="mt-1 text-emerald-800">Admin preview: admins cannot cast votes.</p>}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-medium">Voting is currently closed.</span>
          {votingOpensAt && <span> Opens {votingOpensAt}.</span>}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <p className="font-semibold text-slate-950">Voting rules</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <p>Pick up to {votesTotal} talks you want to see. You do not need to use every vote.</p>
          <p>You can change your selections until voting closes.</p>
          <p>Talk order is randomized per voter to reduce position bias.</p>
          <p>Results stay hidden until organizers publish the final ranked list.</p>
        </div>
      </div>

      {talks.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No talks submitted yet.
        </div>
      )}

      <div className="space-y-4">
        {talks.map(talk => {
          const voted = votedIds.has(talk.id)
          const canVote = isOpen && (!voted ? votesUsed < votesTotal : true)

          return (
            <div key={talk.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start">
              <div className="flex-1">
                <div className="mb-1">
                  <h2 className="font-semibold text-slate-950">{talk.title}</h2>
                </div>
                <p className="text-sm text-slate-500 mb-1">{talk.presenter_name}</p>
                {talk.description && (
                  <p className="text-sm leading-6 text-slate-700">{talk.description}</p>
                )}
              </div>
              <button
                disabled={!canVote || castVote.isPending || retractVote.isPending}
                onClick={() => voted
                  ? retractVote.mutate(talk.id)
                  : castVote.mutate(talk.id)
                }
                className={[
                  'min-h-11 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:shrink-0',
                  voted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : canVote
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-50 text-slate-400 cursor-not-allowed',
                ].join(' ')}
              >
                {voted ? 'Voted' : 'Vote'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
