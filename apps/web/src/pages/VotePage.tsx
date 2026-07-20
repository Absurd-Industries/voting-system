import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { formatDateTime, formatDuration } from '../lib/time.js'
import TalkDetailModal, { type TalkDetail } from '../components/TalkDetailModal.js'

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

type Talk = TalkDetail

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
  const [detailTalk, setDetailTalk] = useState<Talk | null>(null)
  const [filter, setFilter] = useState<string>('All')

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
  const clientServerOffset = useMemo(
    () => (conference ? conference.server_now - Date.now() : 0),
    [conference?.server_now],
  )
  const effectiveNow = now + clientServerOffset

  const castVote = useMutation({
    mutationFn: (talkId: string) => apiFetch(`/api/votes/${talkId}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-votes'] }),
  })
  const retractVote = useMutation({
    mutationFn: (talkId: string) => apiFetch(`/api/votes/${talkId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-votes'] }),
  })

  const talkTypes = useMemo(() => {
    const set = new Set<string>()
    talks.forEach((t) => t.talk_type && set.add(t.talk_type))
    return ['All', ...Array.from(set)]
  }, [talks])

  const visibleTalks = filter === 'All' ? talks : talks.filter((t) => t.talk_type === filter)

  if (confLoading || talksLoading) {
    return <div className="py-16 text-center text-sm text-ink-faint">Loading…</div>
  }
  if (!conference) {
    return <div className="py-16 text-center text-sm text-ink-faint">No conference configured yet.</div>
  }

  const isOpen = conference.voting_status === 'open'
  const votingOpensAt = formatDateTime(conference.voting_opens_at)
  const votingClosesAt = formatDateTime(conference.voting_closes_at)
  const countdownTarget = isOpen ? conference.voting_closes_at : conference.voting_opens_at
  const showCountdown = countdownTarget !== null && countdownTarget > effectiveNow
  const countdownLabel = isOpen ? 'Time left' : 'Opens in'

  return (
    <div className="space-y-6 pb-24 sm:pb-28">
      {/* Header */}
      <div className="kp-card flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="supertitle mb-1">Current conference</p>
          <h1 className="page-title">{conference.name}</h1>
          {conference.description && (
            <p className="mt-2 text-sm leading-relaxed text-ink-light">{conference.description}</p>
          )}
        </div>
        <div className="card-ink shrink-0 px-5 py-4 sm:min-w-[11rem]">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-paper/70">
            <i className="ph-bold ph-clock" aria-hidden="true" />
            {showCountdown ? countdownLabel : isOpen ? 'Voting status' : 'Voting closed'}
          </p>
          <p className="mt-1 font-serif text-2xl font-bold tabular-nums">
            {showCountdown ? formatDuration(countdownTarget! - effectiveNow) : isOpen ? 'Open' : 'Closed'}
          </p>
        </div>
      </div>

      {/* Status */}
      {isOpen ? (
        <div className="status-open">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <i className="ph-bold ph-check-circle" aria-hidden="true" /> Voting is open
            </span>
            <span>{isAdminPreview ? `${votesTotal} votes per voter` : `${votesUsed} of ${votesTotal} votes used`}</span>
          </div>
          {votingClosesAt && <p className="mt-1 text-funded/80">Closes {votingClosesAt}</p>}
          {isAdminPreview && <p className="mt-1 text-funded/80">Admin preview: admins cannot cast votes.</p>}
        </div>
      ) : (
        <div className="status-warn">
          <span className="flex items-center gap-1.5 font-semibold">
            <i className="ph-bold ph-lock-simple" aria-hidden="true" /> Voting is currently closed.
          </span>
          {votingOpensAt && <span> Opens {votingOpensAt}.</span>}
        </div>
      )}

      {/* Rules */}
      <div className="kp-card p-5 text-sm text-ink-light">
        <p className="section-title mb-2">How voting works</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <p>Pick up to {votesTotal} talks you want to see. You do not need to use every vote.</p>
          <p>You can change your selections until voting closes.</p>
          <p>Talk order is randomized per voter to reduce position bias.</p>
          <p>Results stay hidden until organizers publish the final ranked list.</p>
        </div>
      </div>

      {(castVote.error || retractVote.error) && (
        <div className="status-error" role="alert">
          {(castVote.error ?? retractVote.error)?.message}
        </div>
      )}

      {/* Filter pills */}
      {talkTypes.length > 2 && (
        <div className="flex flex-wrap items-center gap-2">
          {talkTypes.map((t) => {
            const active = filter === t
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={[
                  'rounded-full border px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/20 text-ink-faint hover:border-ink hover:text-ink',
                ].join(' ')}
              >
                {t}
                {t !== 'All' && (
                  <span className="ml-1.5 opacity-60">{talks.filter((x) => x.talk_type === t).length}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {visibleTalks.length === 0 ? (
        <div className="empty-state">
          <i className="ph-bold ph-cardboard-box text-3xl opacity-50" aria-hidden="true" />
          <p className="font-serif text-lg font-bold text-ink">No talks here yet</p>
          <p className="text-sm">Check back soon.</p>
        </div>
      ) : (
        <div className="card-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTalks.map((talk, i) => {
            const voted = votedIds.has(talk.id)
            const withdrawn = Boolean(talk.withdrawn_at)
            const canVote = isOpen && !withdrawn && (!voted ? votesUsed < votesTotal : true)
            return (
              <div
                key={talk.id}
                className="kp-card card-hover animate-fade-in-up flex flex-col p-5"
                style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
              >
                <div className="mb-2 flex items-center gap-2">
                  {talk.talk_type && <span className="tag tag-muted">{talk.talk_type}</span>}
                  {voted && (
                    <span className="flex items-center gap-1 text-xs font-bold text-stamp">
                      <i className="ph-fill ph-check-circle" aria-hidden="true" /> Voted
                    </span>
                  )}
                  {withdrawn && <span className="tag tag-danger">Withdrawn</span>}
                </div>
                <h2 className="font-serif text-lg font-bold leading-snug text-ink">{talk.title}</h2>
                {talk.presenter_name && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-faint">
                    <i className="ph-bold ph-user" aria-hidden="true" /> {talk.presenter_name}
                  </p>
                )}
                {talk.description && (
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-light">
                    {talk.description}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setDetailTalk(talk)} className="btn btn-outline btn-sm flex-1">
                    <i className="ph-bold ph-info" aria-hidden="true" /> Details
                  </button>
                  <button
                    disabled={!canVote || castVote.isPending || retractVote.isPending}
                    onClick={() => {
                      voted ? retractVote.mutate(talk.id) : castVote.mutate(talk.id)
                    }}
                    className={['btn btn-sm flex-1', voted ? 'btn-stamp animate-vote-pulse' : 'btn-primary'].join(' ')}
                  >
                    {voted ? (
                      <>
                        <i className="ph-fill ph-check" aria-hidden="true" /> Voted
                      </>
                    ) : (
                      <>
                        <i className="ph-bold ph-hand-pointing" aria-hidden="true" /> Vote
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailTalk && <TalkDetailModal talk={detailTalk} onClose={() => setDetailTalk(null)} />}

      {isOpen && !isAdminPreview && (
        <aside className="vote-progress-card" aria-live="polite" aria-label={`${votesUsed} of ${votesTotal} votes used`}>
          <div className="flex items-center justify-between gap-5 text-xs font-bold uppercase tracking-wide">
            <span>Your votes</span>
            <span className="tabular-nums">{votesUsed} / {votesTotal}</span>
          </div>
          <div className="progress mt-2" aria-hidden="true">
            <div className="progress-fill hot" style={{ width: `${votesTotal > 0 ? (votesUsed / votesTotal) * 100 : 0}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">{Math.max(0, votesTotal - votesUsed)} remaining</p>
        </aside>
      )}
    </div>
  )
}
