import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api.js'

interface Conference {
  id: string
  name: string
  description: string | null
  voting_status: 'open' | 'closed'
  votes_per_voter: number
  voting_opens_at: number | null
  voting_closes_at: number | null
}

interface Talk {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  presenter_name: string
  presenter_bio: string | null
}

interface VotesResponse {
  votes: string[]
  votes_per_voter: number
}

export default function VotePage() {
  const qc = useQueryClient()

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
  const votesTotal = myVotes?.votes_per_voter ?? 0

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{conference.name}</h1>
      {conference.description && (
        <p className="text-gray-600 mb-4">{conference.description}</p>
      )}

      {isOpen ? (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
          Voting is open — {votesUsed} of {votesTotal} votes used
        </div>
      ) : (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
          Voting is currently closed.
          {conference.voting_opens_at && (
            <> Opens {new Date(conference.voting_opens_at).toLocaleString()}</>
          )}
        </div>
      )}

      {talks.length === 0 && (
        <p className="text-gray-500">No talks submitted yet.</p>
      )}

      <div className="space-y-4">
        {talks.map(talk => {
          const voted = votedIds.has(talk.id)
          const canVote = isOpen && (!voted ? votesUsed < votesTotal : true)

          return (
            <div key={talk.id} className="bg-white border rounded-lg p-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {talk.duration_minutes} min
                  </span>
                  <h2 className="font-semibold">{talk.title}</h2>
                </div>
                <p className="text-sm text-gray-500 mb-1">{talk.presenter_name}</p>
                {talk.description && (
                  <p className="text-sm text-gray-700">{talk.description}</p>
                )}
              </div>
              <button
                disabled={!canVote}
                onClick={() => voted
                  ? retractVote.mutate(talk.id)
                  : castVote.mutate(talk.id)
                }
                className={[
                  'px-4 py-2 rounded text-sm font-medium transition-colors shrink-0',
                  voted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : canVote
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed',
                ].join(' ')}
              >
                {voted ? 'Voted ✓' : 'Vote'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
